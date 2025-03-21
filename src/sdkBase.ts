import { version } from '../package.json';
import { OptoutIdentity, Identity, isOptoutIdentity, isValidIdentity } from './Identity';
import { IdentityStatus, InitCallbackManager } from './initCallbacks';
import { SdkOptions, isSDKOptionsOrThrow } from './sdkOptions';
import { Logger, MakeLogger } from './sdk/logger';
import { ApiClient } from './apiClient';
import { EventType, CallbackHandler, CallbackManager } from './callbackManager';
import {
  ClientSideIdentityOptions,
  isClientSideIdentityOptionsOrThrow,
} from './clientSideIdentityOptions';
import { isNormalizedPhone, normalizeEmail } from './diiNormalization';
import { isBase64Hash } from './hashedDii';
import { PromiseHandler } from './promiseHandler';
import { StorageManager } from './storageManager';
import { hashAndEncodeIdentifier, hashIdentifier } from './encoding/hash';
import { ProductDetails, ProductName } from './product';
import { storeConfig, updateConfig } from './configManager';
import { loadIdentityFromCookieNoLegacy } from './cookieManager';
import { loadIdentityWithStorageKey } from './localStorageManager';

function hasExpired(expiry: number, now = Date.now()) {
  return expiry <= now;
}
export type SDKSetup = {
  callbacks: CallbackHandler[] | undefined;
};
export type CallbackContainer = { callback?: () => void };

export class UIDHelper {
  public normalizeEmail(email: string) {
    return normalizeEmail(email);
  }

  public hashIdentifier(normalizedEmail: string) {
    return hashIdentifier(normalizedEmail);
  }

  public async hashAndEncodeIdentifier(normalizedEmail: string) {
    return await hashAndEncodeIdentifier(normalizedEmail);
  }

  public isNormalizedPhone(phone: string) {
    return isNormalizedPhone(phone);
  }
}

export abstract class SdkBase {
  static get VERSION() {
    return version;
  }
  static get DEFAULT_REFRESH_RETRY_PERIOD_MS() {
    return 5000;
  }
  static readonly IdentityStatus = IdentityStatus;
  static readonly EventType = EventType;

  // Push functions to this array to receive event notifications
  public callbacks: CallbackHandler[] = [];

  // Dependencies initialised on construction
  private _logger: Logger;
  private _tokenPromiseHandler: PromiseHandler;
  protected _callbackManager: CallbackManager;

  // Dependencies initialised on call to init due to requirement for options
  private _storageManager: StorageManager | undefined;
  private _apiClient: ApiClient | undefined;
  private _initCallbackManager: InitCallbackManager | undefined;

  // State
  protected _product: ProductDetails;
  private _opts: SdkOptions = {};
  private _identity: Identity | OptoutIdentity | null | undefined;
  private _initComplete = false;

  // Sets up nearly everything, but does not run SdkLoaded callbacks - derived classes must run them.
  protected constructor(existingCallbacks: CallbackHandler[] | undefined, product: ProductDetails) {
    this._product = product;
    this._logger = MakeLogger(console, product.name);
    if (existingCallbacks) this.callbacks = existingCallbacks;

    this._tokenPromiseHandler = new PromiseHandler(this);
    this._callbackManager = new CallbackManager(
      this,
      this._product.name,
      () => this.getIdentity(),
      this._logger
    );
  }

  public init(opts: SdkOptions) {
    this.initInternal(opts);
  }

  private setInitComplete(isInitComplete: boolean) {
    this._initComplete = isInitComplete;
  }

  public getAdvertisingToken() {
    return this.getIdentity()?.advertising_token ?? undefined;
  }

  public async setIdentityFromEmail(email: string, opts: ClientSideIdentityOptions) {
    this.throwIfInitNotComplete('Cannot set identity before calling init.');
    isClientSideIdentityOptionsOrThrow(opts, this._product.name);

    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail === undefined) {
      throw new Error('Invalid email address');
    }

    const emailHash = await hashAndEncodeIdentifier(email);
    await this.callCstgAndSetIdentity({ emailHash: emailHash }, opts);
  }

  public async setIdentityFromEmailHash(emailHash: string, opts: ClientSideIdentityOptions) {
    this.throwIfInitNotComplete('Cannot set identity before calling init.');
    isClientSideIdentityOptionsOrThrow(opts, this._product.name);

    if (!isBase64Hash(emailHash)) {
      throw new Error('Invalid hash');
    }

    await this.callCstgAndSetIdentity({ emailHash: emailHash }, opts);
  }

  public async setIdentityFromPhone(phone: string, opts: ClientSideIdentityOptions) {
    this.throwIfInitNotComplete('Cannot set identity before calling init.');
    isClientSideIdentityOptionsOrThrow(opts, this._product.name);

    if (!isNormalizedPhone(phone)) {
      throw new Error('Invalid phone number');
    }

    const phoneHash = await hashAndEncodeIdentifier(phone);
    await this.callCstgAndSetIdentity({ phoneHash: phoneHash }, opts);
  }

  public async setIdentityFromPhoneHash(phoneHash: string, opts: ClientSideIdentityOptions) {
    this.throwIfInitNotComplete('Cannot set identity before calling init.');
    isClientSideIdentityOptionsOrThrow(opts, this._product.name);

    if (!isBase64Hash(phoneHash)) {
      throw new Error('Invalid hash');
    }

    await this.callCstgAndSetIdentity({ phoneHash: phoneHash }, opts);
  }

  public setIdentity(identity: Identity | OptoutIdentity) {
    if (this._apiClient) this._apiClient.abortActiveRequests();
    const validatedIdentity = this.validateAndSetIdentity(identity);
    if (validatedIdentity) {
      if (isOptoutIdentity(validatedIdentity)) {
        this._callbackManager.runCallbacks(EventType.OptoutReceived, {});
      } else {
        this.triggerRefreshOrSetTimer(validatedIdentity);
      }
      this._callbackManager.runCallbacks(EventType.IdentityUpdated, {});
    }
  }

  public getIdentity(): Identity | null {
    const identity = this._identity ?? this.getIdentityNoInit();
    // if identity is valid (includes not opted out) and available, return it
    return isValidIdentity(identity) && !this.temporarilyUnavailable(identity) ? identity : null;
  }

  // When the SDK has been initialized, this function should return the token
  // from the most recent refresh request, if there is a request, wait for the
  // new token. Otherwise, returns a promise which will be resolved after init.
  public getAdvertisingTokenAsync() {
    const token = this.getAdvertisingToken();
    return this._tokenPromiseHandler.createMaybeDeferredPromise(token ?? null);
  }

  public isInitComplete(): boolean {
    return this._initComplete;
  }

  public isLoginRequired() {
    const identity = this._identity ?? this.getIdentityNoInit();
    // if identity temporarily unavailable, login is not required
    if (this.temporarilyUnavailable(identity)) {
      return false;
    }
    return !this.isIdentityAvailable();
  }

  public isIdentityAvailable() {
    const identity = this._identity ?? this.getIdentityNoInit();
    // available if identity exists and has not expired or if there active requests
    return (
      (identity &&
        !hasExpired(identity.refresh_expires) &&
        !this.temporarilyUnavailable(identity)) ||
      this._apiClient?.hasActiveRequests()
    );
  }

  public hasOptedOut() {
    if (!this._initComplete) return undefined;
    return isOptoutIdentity(this._identity);
  }

  public disconnect() {
    this._tokenPromiseHandler.rejectAllPromises(new Error(`${this._product.name} SDK aborted.`));
    if (this._refreshTimerId) {
      clearTimeout(this._refreshTimerId);
      this._refreshTimerId = null;
    }
    if (this._apiClient) this._apiClient.abortActiveRequests();
    // Note: This silently fails to clear the cookie if init hasn't been called and a cookieDomain is used!
    if (this._storageManager) this._storageManager.removeValues();
    else
      new StorageManager(
        {},
        this._product.cookieName,
        this._product.localStorageKey
      ).removeValues();
    this._identity = undefined;
    this._callbackManager.runCallbacks(EventType.IdentityUpdated, {
      identity: null,
    });
  }

  private initInternal(opts: SdkOptions | unknown) {
    if (!isSDKOptionsOrThrow(opts))
      throw new TypeError(`Options provided to ${this._product.name} init couldn't be validated.`);

    if (this.isInitComplete()) {
      const previousOpts = { ...this._opts };
      Object.assign(this._opts, opts);

      if (opts.baseUrl && opts.baseUrl !== previousOpts.baseUrl) {
        this._apiClient?.updateBaseUrl(opts.baseUrl);
      }

      if (opts.callback && opts.callback !== previousOpts.callback) {
        this._initCallbackManager?.addInitCallback(opts.callback);
      }

      let useNewIdentity;
      if (!opts.identity) useNewIdentity = true;
      else {
        useNewIdentity =
          !previousOpts.identity ||
          opts.identity.identity_expires > previousOpts.identity.identity_expires;
      }

      if (useNewIdentity || opts.callback) {
        let identity = useNewIdentity ? opts.identity : previousOpts.identity ?? null;
        if (identity) {
          this.handleNewIdentity(identity);
        }
      }

      if (opts.refreshRetryPeriod && previousOpts.refreshRetryPeriod !== opts.refreshRetryPeriod) {
        this.setRefreshTimer();
      }

      updateConfig(this._opts, this._product, previousOpts);
      this._storageManager = new StorageManager(
        this._opts,
        this._product.cookieName,
        this._product.localStorageKey
      );
      this._storageManager?.updateValue(this._opts, this._product.cookieName, previousOpts);
    } else {
      storeConfig(opts, this._product);
      this._opts = opts;
      this._storageManager = new StorageManager(
        { ...opts },
        this._product.cookieName,
        this._product.localStorageKey
      );

      this._apiClient = new ApiClient(opts, this._product.defaultBaseUrl, this._product.name);
      this._tokenPromiseHandler.registerApiClient(this._apiClient);

      this._initCallbackManager = new InitCallbackManager(opts);

      let identity;
      if (this._opts.identity) {
        identity = this._opts.identity;
      } else {
        identity = this._storageManager.loadIdentityWithFallback();
      }
      this.handleNewIdentity(identity);
    }

    this.setInitComplete(true);
    this._callbackManager?.runCallbacks(EventType.InitCompleted, {});
    if (this.hasOptedOut()) this._callbackManager.runCallbacks(EventType.OptoutReceived, {});
  }

  private temporarilyUnavailable(identity: Identity | OptoutIdentity | null | undefined) {
    if (!identity && this._apiClient?.hasActiveRequests()) return true;
    // returns true if identity is expired but refreshable
    if (identity && hasExpired(identity.identity_expires) && !hasExpired(identity.refresh_expires))
      return true;
    return false;
  }

  private getIdentityStatus(identity: Identity | OptoutIdentity | null):
    | {
        valid: true;
        identity: Identity;
        errorMessage: string;
        status: IdentityStatus;
      }
    | {
        valid: false;
        errorMessage: string;
        status: IdentityStatus;
        identity: OptoutIdentity | null;
      } {
    if (!identity) {
      return {
        valid: false,
        errorMessage: 'Identity not available',
        status: IdentityStatus.NO_IDENTITY,
        identity: null,
      };
    }
    if (isOptoutIdentity(identity)) {
      return {
        valid: false,
        errorMessage: 'User has opted out',
        status: IdentityStatus.OPTOUT,
        identity: identity,
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
    identity: Identity | OptoutIdentity | null,
    status?: IdentityStatus,
    statusText?: string
  ): Identity | OptoutIdentity | null {
    if (!this._storageManager) throw new Error('Cannot set identity before calling init.');
    const validity = this.getIdentityStatus(identity);
    if (
      validity.valid &&
      validity.identity &&
      !isOptoutIdentity(this._identity) &&
      validity.identity?.advertising_token === this._identity?.advertising_token
    )
      return validity.identity;

    if (validity.valid && validity.identity) {
      this._storageManager.setIdentity(validity.identity);
    } else if (validity.status === IdentityStatus.OPTOUT || status === IdentityStatus.OPTOUT) {
      this._storageManager.setOptout();
    } else {
      this.disconnect();
    }

    this._identity = this._storageManager.loadIdentity();
    this._initCallbackManager?.notifyInitCallbacks(
      status ?? validity.status,
      statusText ?? validity.errorMessage,
      this.getAdvertisingToken(),
      this._logger
    );
    return validity.identity;
  }

  private triggerRefreshOrSetTimer(validIdentity: Identity) {
    if (hasExpired(validIdentity.refresh_from, Date.now())) {
      this.refreshToken(validIdentity);
    } else {
      this.setRefreshTimer();
    }
  }

  private handleNewIdentity(identity: Identity | OptoutIdentity | null) {
    const validatedIdentity = this.validateAndSetIdentity(identity);
    if (validatedIdentity && !isOptoutIdentity(validatedIdentity))
      this.triggerRefreshOrSetTimer(validatedIdentity);
  }

  private _refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  private setRefreshTimer() {
    const timeout = this._opts?.refreshRetryPeriod ?? SdkBase.DEFAULT_REFRESH_RETRY_PERIOD_MS;
    if (this._refreshTimerId) {
      clearTimeout(this._refreshTimerId);
    }
    this._refreshTimerId = setTimeout(() => {
      if (this.isLoginRequired()) return;
      const validatedIdentity = this.validateAndSetIdentity(
        this._storageManager?.loadIdentity() ?? null
      );
      if (validatedIdentity && !isOptoutIdentity(validatedIdentity))
        this.triggerRefreshOrSetTimer(validatedIdentity);
      this._refreshTimerId = null;
    }, timeout);
  }

  private refreshToken(identity: Identity) {
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
              this._callbackManager.runCallbacks(EventType.OptoutReceived, {});
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

  private getIdentityNoInit() {
    return (
      loadIdentityFromCookieNoLegacy(this._product.cookieName) ??
      loadIdentityWithStorageKey(this._product.localStorageKey)
    );
  }

  protected async callCstgAndSetIdentity(
    request: { emailHash: string } | { phoneHash: string },
    opts: ClientSideIdentityOptions
  ) {
    const cstgResult = await this._apiClient!.callCstgApi(request, opts);
    if (cstgResult.status == 'success') {
      this.setIdentity(cstgResult.identity);
    } else if (cstgResult.status === 'optout') {
      this.validateAndSetIdentity(null, IdentityStatus.OPTOUT);
      this._callbackManager.runCallbacks(EventType.OptoutReceived, {});
      this._callbackManager.runCallbacks(EventType.IdentityUpdated, {});
    } else {
      const errorText = 'Unexpected status received from CSTG endpoint.';
      this._logger.warn(errorText);
      throw new Error(errorText);
    }
  }

  protected throwIfInitNotComplete(message: string) {
    if (!this._initComplete) {
      throw new Error(message);
    }
  }
}

export function sdkAssertErrorText(product: ProductName, functionName: string) {
  return `Assertion failed: the provided value is not an instance of ${product}. Have you called ${functionName} from outside a callback function?`;
}
