import { version } from '../package.json';
import { Uid2Identity } from './Uid2Identity';
import { IdentityStatus, notifyInitCallback } from './Uid2InitCallbacks';
import { Uid2Options, isUID2OptionsOrThrow } from './Uid2Options';
import { Logger, MakeLogger } from './sdk/logger';
import { Uid2ApiClient } from './uid2ApiClient';
import { bytesToBase64 } from './encoding/uid2Base64';
import { EventType, Uid2CallbackHandler, Uid2CallbackManager } from './uid2CallbackManager';
import {
  ClientSideIdentityOptions,
  isClientSideIdentityOptionsOrThrow,
} from './uid2ClientSideIdentityOptions';
import { isNormalizedPhone, normalizeEmail } from './uid2DiiNormalization';
import { isBase64Hash } from './uid2HashedDii';
import { UID2PromiseHandler } from './uid2PromiseHandler';
import { UID2StorageManager } from './uid2StorageManager';
import { hashAndEncodeIdentifier } from './encoding/hash';

function hasExpired(expiry: number, now = Date.now()) {
  return expiry <= now;
}

type CallbackContainer = { callback?: () => void };

type ProductName = 'UID2' | 'EUID';
type ProductDetails = {
  name: ProductName;
  cookieName: string;
  localStorageKey: string;
  defaultBaseUrl: string;
};

export abstract class UID2SdkBase {
  static get VERSION() {
    return version;
  }
  static get DEFAULT_REFRESH_RETRY_PERIOD_MS() {
    return 5000;
  }
  static IdentityStatus = IdentityStatus;
  static EventType = EventType;

  // Push functions to this array to receive event notifications
  public callbacks: Uid2CallbackHandler[] = [];

  // Dependencies initialised on construction
  private _logger: Logger;
  private _tokenPromiseHandler: UID2PromiseHandler;
  protected _callbackManager: Uid2CallbackManager;

  // Dependencies initialised on call to init due to requirement for options
  private _storageManager: UID2StorageManager | undefined;
  private _apiClient: Uid2ApiClient | undefined;

  // State
  private _product: ProductDetails;
  private _opts: Uid2Options = {};
  private _identity: Uid2Identity | null | undefined;
  private _initComplete = false;

  // Sets up nearly everything, but does not run SdkLoaded callbacks - derived classes must run them.
  protected constructor(
    existingCallbacks: Uid2CallbackHandler[] | undefined = undefined,
    product: ProductDetails
  ) {
    this._product = product;
    this._logger = MakeLogger(console, product.name);
    if (existingCallbacks) this.callbacks = existingCallbacks;

    this._tokenPromiseHandler = new UID2PromiseHandler(this);
    this._callbackManager = new Uid2CallbackManager(this, () => this.getIdentity(), this._logger);
  }

  public init(opts: Uid2Options) {
    this.initInternal(opts);
  }

  public getAdvertisingToken() {
    return this.getIdentity()?.advertising_token ?? undefined;
  }

  public async setIdentityFromEmail(email: string, opts: ClientSideIdentityOptions) {
    this.throwIfInitNotComplete('Cannot set identity before calling init.');
    isClientSideIdentityOptionsOrThrow(opts);

    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail === undefined) {
      throw new Error('Invalid email address');
    }

    const emailHash = await hashAndEncodeIdentifier(email);
    await this.callCstgAndSetIdentity({ emailHash: emailHash }, opts);
  }

  public async setIdentityFromEmailHash(emailHash: string, opts: ClientSideIdentityOptions) {
    this.throwIfInitNotComplete('Cannot set identity before calling init.');
    isClientSideIdentityOptionsOrThrow(opts);

    if (!isBase64Hash(emailHash)) {
      throw new Error('Invalid hash');
    }

    await this.callCstgAndSetIdentity({ emailHash: emailHash }, opts);
  }

  public setIdentity(identity: Uid2Identity) {
    if (this._apiClient) this._apiClient.abortActiveRequests();
    const validatedIdentity = this.validateAndSetIdentity(identity);
    if (validatedIdentity) {
      this.triggerRefreshOrSetTimer(validatedIdentity);
      this._callbackManager.runCallbacks(EventType.IdentityUpdated, {});
    }
  }

  public getIdentity(): Uid2Identity | null {
    return this._identity && !this.temporarilyUnavailable() ? this._identity : null;
  }
  // When the SDK has been initialized, this function should return the token
  // from the most recent refresh request, if there is a request, wait for the
  // new token. Otherwise, returns a promise which will be resolved after init.
  public getAdvertisingTokenAsync() {
    const token = this.getAdvertisingToken();
    return this._tokenPromiseHandler.createMaybeDeferredPromise(token ?? null);
  }

  // Deprecated
  public isLoginRequired() {
    return this.isSetIdentityRequired();
  }

  public isSetIdentityRequired() {
    if (!this._initComplete) return undefined;
    return !(this.isLoggedIn() || this._apiClient?.hasActiveRequests());
  }

  public disconnect() {
    this.abort(`${this._product.name} SDK disconnected.`);
    // Note: This silently fails to clear the cookie if init hasn't been called and a cookieDomain is used!
    if (this._storageManager) this._storageManager.removeValues();
    else
      new UID2StorageManager(
        {},
        this._product.cookieName,
        this._product.localStorageKey
      ).removeValues();
    this._identity = undefined;
    this._callbackManager.runCallbacks(EventType.IdentityUpdated, {
      identity: null,
    });
  }

  // Note: This doesn't invoke callbacks. It's a hard, silent reset.
  public abort(reason?: string) {
    this._initComplete = true;
    this._tokenPromiseHandler.rejectAllPromises(
      reason ?? new Error(`${this._product.name} SDK aborted.`)
    );
    if (this._refreshTimerId) {
      clearTimeout(this._refreshTimerId);
      this._refreshTimerId = null;
    }
    if (this._apiClient) this._apiClient.abortActiveRequests();
  }

  private initInternal(opts: Uid2Options | unknown) {
    if (this._initComplete) {
      throw new TypeError('Calling init() more than once is not allowed');
    }
    if (!isUID2OptionsOrThrow(opts))
      throw new TypeError(`Options provided to ${this._product.name} init couldn't be validated.`);

    this._opts = opts;
    this._storageManager = new UID2StorageManager(
      { ...opts },
      this._product.cookieName,
      this._product.localStorageKey
    );
    this._apiClient = new Uid2ApiClient(opts, this._product.defaultBaseUrl, this._product.name);
    this._tokenPromiseHandler.registerApiClient(this._apiClient);

    let identity;
    if (this._opts.identity) {
      identity = this._opts.identity;
    } else {
      identity = this._storageManager.loadIdentityWithFallback();
    }
    const validatedIdentity = this.validateAndSetIdentity(identity);
    if (validatedIdentity) this.triggerRefreshOrSetTimer(validatedIdentity);
    this._initComplete = true;
    this._callbackManager?.runCallbacks(EventType.InitCompleted, {});
  }

  private isLoggedIn() {
    return this._identity && !hasExpired(this._identity.refresh_expires);
  }

  private temporarilyUnavailable() {
    if (!this._identity && this._apiClient?.hasActiveRequests()) return true;
    if (
      this._identity &&
      hasExpired(this._identity.identity_expires) &&
      !hasExpired(this._identity.refresh_expires)
    )
      return true;
    return false;
  }

  private getIdentityStatus(identity: Uid2Identity | null):
    | {
        valid: true;
        identity: Uid2Identity;
        errorMessage: string;
        status: IdentityStatus;
      }
    | {
        valid: false;
        errorMessage: string;
        status: IdentityStatus;
        identity: null;
      } {
    if (!identity) {
      return {
        valid: false,
        errorMessage: 'Identity not available',
        status: IdentityStatus.NO_IDENTITY,
        identity: null,
      };
    }
    if (!identity.advertising_token) {
      return {
        valid: false,
        errorMessage: 'advertising_token is not available or is not valid',
        status: IdentityStatus.INVALID,
        identity: null,
      };
    }
    if (!identity.refresh_token) {
      return {
        valid: false,
        errorMessage: 'refresh_token is not available or is not valid',
        status: IdentityStatus.INVALID,
        identity: null,
      };
    }
    if (hasExpired(identity.refresh_expires, Date.now())) {
      return {
        valid: false,
        errorMessage: 'Identity expired, refresh expired',
        status: IdentityStatus.REFRESH_EXPIRED,
        identity: null,
      };
    }
    if (hasExpired(identity.identity_expires, Date.now())) {
      return {
        valid: true,
        errorMessage: 'Identity expired, refresh still valid',
        status: IdentityStatus.EXPIRED,
        identity,
      };
    }
    if (typeof this._identity === 'undefined')
      return {
        valid: true,
        identity,
        status: IdentityStatus.ESTABLISHED,
        errorMessage: 'Identity established',
      };
    return {
      valid: true,
      identity,
      status: IdentityStatus.REFRESHED,
      errorMessage: 'Identity refreshed',
    };
  }

  private validateAndSetIdentity(
    identity: Uid2Identity | null,
    status?: IdentityStatus,
    statusText?: string
  ): Uid2Identity | null {
    if (!this._storageManager) throw new Error('Cannot set identity before calling init.');
    const validity = this.getIdentityStatus(identity);
    if (
      validity.identity &&
      validity.identity?.advertising_token === this._identity?.advertising_token
    )
      return validity.identity;

    this._identity = validity.identity;
    if (validity.identity) {
      this._storageManager.setValue(validity.identity);
    } else {
      this.abort();
      this._storageManager.removeValues();
    }
    notifyInitCallback(
      this._opts,
      status ?? validity.status,
      statusText ?? validity.errorMessage,
      this.getAdvertisingToken(),
      this._logger
    );
    return validity.identity;
  }

  private triggerRefreshOrSetTimer(validIdentity: Uid2Identity) {
    if (hasExpired(validIdentity.refresh_from, Date.now())) {
      this.refreshToken(validIdentity);
    } else {
      this.setRefreshTimer();
    }
  }

  private _refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  private setRefreshTimer() {
    const timeout = this._opts?.refreshRetryPeriod ?? UID2.DEFAULT_REFRESH_RETRY_PERIOD_MS;
    if (this._refreshTimerId) {
      clearTimeout(this._refreshTimerId);
    }
    this._refreshTimerId = setTimeout(() => {
      if (this.isLoginRequired()) return;
      const validatedIdentity = this.validateAndSetIdentity(
        this._storageManager?.loadIdentity() ?? null
      );
      if (validatedIdentity) this.triggerRefreshOrSetTimer(validatedIdentity);
      this._refreshTimerId = null;
    }, timeout);
  }

  private refreshToken(identity: Uid2Identity) {
    const apiClient = this._apiClient;
    if (!apiClient) throw new Error('Cannot refresh the token before calling init.');

    apiClient
      .callRefreshApi(identity)
      .then(
        (response) => {
          switch (response.status) {
            case 'success':
              this.validateAndSetIdentity(
                response.identity,
                IdentityStatus.REFRESHED,
                'Identity refreshed'
              );
              this.setRefreshTimer();
              break;
            case 'optout':
              this.validateAndSetIdentity(null, IdentityStatus.OPTOUT, 'User opted out');
              break;
            case 'expired_token':
              this.validateAndSetIdentity(
                null,
                IdentityStatus.REFRESH_EXPIRED,
                'Refresh token expired'
              );
              break;
          }
        },
        (reason) => {
          this._logger.warn(`Encountered an error refreshing the token`, reason);
          this.validateAndSetIdentity(identity);
          if (!hasExpired(identity.refresh_expires, Date.now())) this.setRefreshTimer();
        }
      )
      .then(
        () => {
          this._callbackManager.runCallbacks(EventType.IdentityUpdated, {});
        },
        (reason) => this._logger.warn(`Callbacks on identity event failed.`, reason)
      );
  }

  protected async callCstgAndSetIdentity(
    request: { emailHash: string } | { phoneHash: string },
    opts: ClientSideIdentityOptions
  ) {
    const cstgResult = await this._apiClient!.callCstgApi(request, opts);

    this.setIdentity(cstgResult.identity);
  }

  protected throwIfInitNotComplete(message: string) {
    if (!this._initComplete) {
      throw new Error(message);
    }
  }
}

export class UID2 extends UID2SdkBase {
  // Deprecated. Integrators should never access the cookie directly!
  static get COOKIE_NAME() {
    return '__uid_2';
  }
  private static get Uid2Details(): ProductDetails {
    return {
      name: 'UID2',
      defaultBaseUrl: 'https://prod.uidapi.com',
      localStorageKey: 'UID2-sdk-identity',
      cookieName: UID2.COOKIE_NAME,
    };
  }

  static setupGoogleTag() {
    UID2.setupGoogleSecureSignals();
  }

  static setupGoogleSecureSignals() {
    if (window.__uid2SecureSignalProvider)
      window.__uid2SecureSignalProvider.registerSecureSignalProvider();
  }

  constructor(
    existingCallbacks: Uid2CallbackHandler[] | undefined = undefined,
    callbackContainer: CallbackContainer = {}
  ) {
    super(existingCallbacks, UID2.Uid2Details);
    const runCallbacks = () => {
      this._callbackManager.runCallbacks(EventType.SdkLoaded, {});
    };
    if (window.__uid2 instanceof UID2) {
      runCallbacks();
    } else {
      // Need to defer running callbacks until this is assigned to the window global
      callbackContainer.callback = runCallbacks;
    }
  }

  public async setIdentityFromPhone(phone: string, opts: ClientSideIdentityOptions) {
    this.throwIfInitNotComplete('Cannot set identity before calling init.');
    isClientSideIdentityOptionsOrThrow(opts);

    if (!isNormalizedPhone(phone)) {
      throw new Error('Invalid phone number');
    }

    const phoneHash = await hashAndEncodeIdentifier(phone);
    await this.callCstgAndSetIdentity({ phoneHash: phoneHash }, opts);
  }

  public async setIdentityFromPhoneHash(phoneHash: string, opts: ClientSideIdentityOptions) {
    this.throwIfInitNotComplete('Cannot set identity before calling init.');
    isClientSideIdentityOptionsOrThrow(opts);

    if (!isBase64Hash(phoneHash)) {
      throw new Error('Invalid hash');
    }

    await this.callCstgAndSetIdentity({ phoneHash: phoneHash }, opts);
  }
}

type UID2Setup = {
  callbacks: Uid2CallbackHandler[] | undefined;
};
declare global {
  interface Window {
    __uid2: UID2 | UID2Setup | undefined;
  }
}

export function __uid2InternalHandleScriptLoad() {
  const callbacks = window?.__uid2?.callbacks || [];
  const callbackContainer: CallbackContainer = {};
  window.__uid2 = new UID2(callbacks, callbackContainer);
  if (callbackContainer.callback) callbackContainer.callback();
}
__uid2InternalHandleScriptLoad();

export const sdkWindow = globalThis.window;
