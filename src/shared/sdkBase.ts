import { version } from '../../package.json';
import { OptoutIdentity, Identity, isOptoutIdentity } from './Identity';
import { IdentityStatus, notifyInitCallback } from './initCallbacks';
import { SdkOptions, isSDKOptionsOrThrow } from './sdkOptions';
import { Logger, MakeLogger } from './sdk/logger';
import { ApiClient } from './apiClient';
import { EventType, CallbackHandler, CallbackManager } from './callbackManager';
import {
  ClientSideIdentityOptions,
  isClientSideIdentityOptionsOrThrow,
} from './clientSideIdentityOptions';
import { normalizeEmail } from './diiNormalization';
import { isBase64Hash } from './hashedDii';
import { PromiseHandler } from './promiseHandler';
import { StorageManager } from './storageManager';
import { hashAndEncodeIdentifier } from './encoding/hash';
import { ProductDetails } from './product';

function hasExpired(expiry: number, now = Date.now()) {
  return expiry <= now;
}
export type SDKSetup = {
  callbacks: CallbackHandler[] | undefined;
};
export type CallbackContainer = { callback?: () => void };

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

  public getAdvertisingToken() {
    return this.getIdentity()?.advertising_token ?? undefined;
  }

  public async setIdentityFromEmail(email: string, opts: ClientSideIdentityOptions) {
    this._logger.log('Sending request', email);
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
    return this._identity && !this.temporarilyUnavailable() && !isOptoutIdentity(this._identity)
      ? this._identity
      : null;
  }
  // When the SDK has been initialized, this function should return the token
  // from the most recent refresh request, if there is a request, wait for the
  // new token. Otherwise, returns a promise which will be resolved after init.
  public getAdvertisingTokenAsync() {
    const token = this.getAdvertisingToken();
    return this._tokenPromiseHandler.createMaybeDeferredPromise(token ?? null);
  }

  /**
   * Deprecated
   */
  public isLoginRequired() {
    return this.hasIdentity();
  }

  public hasIdentity() {
    if (!this._initComplete) return undefined;
    return !(this.isLoggedIn() || this._apiClient?.hasActiveRequests());
  }

  public hasOptedOut() {
    if (!this._initComplete) return undefined;
    return isOptoutIdentity(this._identity);
  }

  public disconnect() {
    this.abort(`${this._product.name} SDK disconnected.`);
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

  private initInternal(opts: SdkOptions | unknown) {
    if (this._initComplete) {
      throw new TypeError('Calling init() more than once is not allowed');
    }
    if (!isSDKOptionsOrThrow(opts))
      throw new TypeError(`Options provided to ${this._product.name} init couldn't be validated.`);

    this._opts = opts;
    this._storageManager = new StorageManager(
      { ...opts },
      this._product.cookieName,
      this._product.localStorageKey
    );
    this._apiClient = new ApiClient(opts, this._product.defaultBaseUrl, this._product.name);
    this._tokenPromiseHandler.registerApiClient(this._apiClient);

    let identity;
    if (this._opts.identity) {
      identity = this._opts.identity;
    } else {
      identity = this._storageManager.loadIdentityWithFallback();
    }
    const validatedIdentity = this.validateAndSetIdentity(identity);
    if (validatedIdentity && !isOptoutIdentity(validatedIdentity))
      this.triggerRefreshOrSetTimer(validatedIdentity);
    this._initComplete = true;
    this._callbackManager?.runCallbacks(EventType.InitCompleted, {});
    if (this.hasOptedOut()) this._callbackManager.runCallbacks(EventType.OptoutReceived, {});
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

    this._identity = validity.identity;
    if (validity.valid && validity.identity) {
      this._storageManager.setIdentity(validity.identity);
    } else if (validity.status === IdentityStatus.OPTOUT || status === IdentityStatus.OPTOUT) {
      this._storageManager.setOptout();
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

  private triggerRefreshOrSetTimer(validIdentity: Identity) {
    if (hasExpired(validIdentity.refresh_from, Date.now())) {
      this.refreshToken(validIdentity);
    } else {
      this.setRefreshTimer();
    }
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
