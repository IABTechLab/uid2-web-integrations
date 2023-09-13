import { Uid2ApiClient } from "./uid2ApiClient";
import {
  EventType,
  Uid2CallbackHandler,
  Uid2CallbackManager,
} from "./uid2CallbackManager";
import { UID2CookieManager } from "./uid2CookieManager";
import { Uid2Identity } from "./Uid2Identity";
import { IdentityStatus, notifyInitCallback } from "./Uid2InitCallbacks";
import { isUID2OptionsOrThrow, Uid2Options } from "./Uid2Options";
import { UID2PromiseHandler } from "./uid2PromiseHandler";
import { version } from "../package.json";
import { isBase64Hash } from "./uid2HashedDii";
import { isNormalizedPhone, normalizeEmail } from "./uid2DiiNormalization";
import {
  ClientSideIdentityOptions,
  isClientSideIdentityOptionsOrThrow,
} from "./uid2ClientSideIdentityOptions";
import { bytesToBase64 } from "./uid2Base64";
import { UID2LocalStorageManager } from "./uid2LocalStorageManager";

function hasExpired(expiry: number, now = Date.now()) {
  return expiry <= now;
}

let postUid2CreateCallback: null | (() => void) = null;

export class UID2 {
  static get VERSION() {
    return version;
  }
  static get COOKIE_NAME() {
    return "__uid_2";
  }
  static get DEFAULT_REFRESH_RETRY_PERIOD_MS() {
    return 5000;
  }
  static IdentityStatus = IdentityStatus;
  static EventType = EventType;

  static setupGoogleTag() {
    UID2.setupGoogleSecureSignals();
  }

  static setupGoogleSecureSignals() {
    if (window.__uid2SecureSignalProvider)
      window.__uid2SecureSignalProvider.registerSecureSignalProvider();
  }

  // Push functions to this array to receive event notifications
  public callbacks: Uid2CallbackHandler[] = [];

  // Dependencies initialised on construction
  private _tokenPromiseHandler: UID2PromiseHandler;
  private _callbackManager: Uid2CallbackManager;

  // Dependencies initialised on call to init due to requirement for options
  private _cookieManager: UID2CookieManager | undefined;
  private _localStorageManager: UID2LocalStorageManager | undefined;
  private _apiClient: Uid2ApiClient | undefined;

  // State
  private _opts: Uid2Options = {};
  private _identity: Uid2Identity | null | undefined;
  private _initComplete = false;

  constructor(
    existingCallbacks: Uid2CallbackHandler[] | undefined = undefined
  ) {
    if (existingCallbacks) this.callbacks = existingCallbacks;

    this._tokenPromiseHandler = new UID2PromiseHandler(this);
    this._callbackManager = new Uid2CallbackManager(this, () =>
      this.getIdentity()
    );
    const runCallbacks = () => {
      this._callbackManager.runCallbacks(EventType.SdkLoaded, {});
    };
    if (window.__uid2 instanceof UID2) {
      runCallbacks();
    } else {
      // Need to defer running callbacks until this is assigned to the window global
      postUid2CreateCallback = runCallbacks;
    }
  }

  public init(opts: Uid2Options) {
    this.initInternal(opts);
  }

  public getAdvertisingToken() {
    return this.getIdentity()?.advertising_token ?? undefined;
  }

  public async setIdentityFromEmail(
    email: string,
    opts: ClientSideIdentityOptions
  ) {
    this.throwIfInitNotComplete("Cannot set identity before calling init.");
    isClientSideIdentityOptionsOrThrow(opts);

    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail === undefined) {
      throw new Error("Invalid email address");
    }

    const emailHash = await UID2.hash(email);
    await this.callCstgAndSetIdentity({ emailHash: emailHash }, opts);
  }

  public async setIdentityFromEmailHash(
    emailHash: string,
    opts: ClientSideIdentityOptions
  ) {
    this.throwIfInitNotComplete("Cannot set identity before calling init.");
    isClientSideIdentityOptionsOrThrow(opts);

    if (!isBase64Hash(emailHash)) {
      throw new Error("Invalid hash");
    }

    await this.callCstgAndSetIdentity({ emailHash: emailHash }, opts);
  }

  public async setIdentityFromPhone(
    phone: string,
    opts: ClientSideIdentityOptions
  ) {
    this.throwIfInitNotComplete("Cannot set identity before calling init.");
    isClientSideIdentityOptionsOrThrow(opts);

    if (!isNormalizedPhone(phone)) {
      throw new Error("Invalid phone number");
    }

    const phoneHash = await UID2.hash(phone);
    await this.callCstgAndSetIdentity({ phoneHash: phoneHash }, opts);
  }

  public async setIdentityFromPhoneHash(
    phoneHash: string,
    opts: ClientSideIdentityOptions
  ) {
    this.throwIfInitNotComplete("Cannot set identity before calling init.");
    isClientSideIdentityOptionsOrThrow(opts);

    if (!isBase64Hash(phoneHash)) {
      throw new Error("Invalid hash");
    }

    await this.callCstgAndSetIdentity({ phoneHash: phoneHash }, opts);
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
    return this._identity && !this.temporarilyUnavailable()
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

  public isLoginRequired() {
    if (!this._initComplete) return undefined;
    return !(this.isLoggedIn() || this._apiClient?.hasActiveRequests());
  }

  public disconnect() {
    this.abort(`UID2 SDK disconnected.`);
    // Note: This silently fails to clear the cookie if init hasn't been called and a cookieDomain is used!
    if (this._cookieManager) this._cookieManager.removeCookie();
    else new UID2CookieManager({}).removeCookie();
    this._identity = undefined;
    this._callbackManager.runCallbacks(UID2.EventType.IdentityUpdated, {
      identity: null,
    });
  }

  // Note: This doesn't invoke callbacks. It's a hard, silent reset.
  public abort(reason?: string) {
    this._initComplete = true;
    this._tokenPromiseHandler.rejectAllPromises(
      reason ?? new Error(`UID2 SDK aborted.`)
    );
    if (this._refreshTimerId) {
      clearTimeout(this._refreshTimerId);
      this._refreshTimerId = null;
    }
    if (this._apiClient) this._apiClient.abortActiveRequests();
  }

  private static async hash(value: string) {
    const hash = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value)
    );
    return bytesToBase64(new Uint8Array(hash));
  }

  private initInternal(opts: Uid2Options | unknown) {
    if (this._initComplete) {
      throw new TypeError("Calling init() more than once is not allowed");
    }
    if (!isUID2OptionsOrThrow(opts))
      throw new TypeError(
        `Options provided to UID2 init couldn't be validated.`
      );

    this._opts = opts;
    this._cookieManager = new UID2CookieManager({ ...opts });
    this._localStorageManager = new UID2LocalStorageManager();
    this._apiClient = new Uid2ApiClient(opts);
    this._tokenPromiseHandler.registerApiClient(this._apiClient);

    let identity;
    if (this._opts.identity) {
      identity = this._opts.identity;
    } else {
      const localStorageIdentity = this._localStorageManager.loadIdentityFromLocalStorage();
      const cookieIdentity = this._cookieManager.loadIdentityFromCookie();
      const shouldUseCookie = cookieIdentity && (!localStorageIdentity || cookieIdentity.identity_expires > localStorageIdentity.identity_expires);
      identity = shouldUseCookie ? cookieIdentity : localStorageIdentity;
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
        errorMessage: "Identity not available",
        status: UID2.IdentityStatus.NO_IDENTITY,
        identity: null,
      };
    }
    if (!identity.advertising_token) {
      return {
        valid: false,
        errorMessage: "advertising_token is not available or is not valid",
        status: IdentityStatus.INVALID,
        identity: null,
      };
    }
    if (!identity.refresh_token) {
      return {
        valid: false,
        errorMessage: "refresh_token is not available or is not valid",
        status: IdentityStatus.INVALID,
        identity: null,
      };
    }
    if (hasExpired(identity.refresh_expires, Date.now())) {
      return {
        valid: false,
        errorMessage: "Identity expired, refresh expired",
        status: IdentityStatus.REFRESH_EXPIRED,
        identity: null,
      };
    }
    if (hasExpired(identity.identity_expires, Date.now())) {
      return {
        valid: true,
        errorMessage: "Identity expired, refresh still valid",
        status: IdentityStatus.EXPIRED,
        identity,
      };
    }
    if (typeof this._identity === "undefined")
      return {
        valid: true,
        identity,
        status: IdentityStatus.ESTABLISHED,
        errorMessage: "Identity established",
      };
    return {
      valid: true,
      identity,
      status: IdentityStatus.REFRESHED,
      errorMessage: "Identity refreshed",
    };
  }

  private validateAndSetIdentity(
    identity: Uid2Identity | null,
    status?: IdentityStatus,
    statusText?: string
  ): Uid2Identity | null {
    if (!this._cookieManager || !this._localStorageManager)
      throw new Error("Cannot set identity before calling init.");
    const validity = this.getIdentityStatus(identity);
    if (
      validity.identity &&
      validity.identity?.advertising_token === this._identity?.advertising_token
    )
      return validity.identity;

    this._identity = validity.identity;
    if (validity.identity) {
      if (this._opts.useCookie) {
        this._cookieManager.setCookie(validity.identity);
      }
      else if (this._opts.useCookie === false) {
        this._localStorageManager.setValue(validity.identity);
        this._cookieManager.removeCookie();
      } else if (this._opts.useCookie === undefined) {
        this._localStorageManager.setValue(validity.identity);
      }
    } else {
      this.abort();
      this._cookieManager.removeCookie();
      this._localStorageManager.removeValue();
    }
    notifyInitCallback(
      this._opts,
      status ?? validity.status,
      statusText ?? validity.errorMessage,
      this.getAdvertisingToken()
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
    const timeout =
      this._opts?.refreshRetryPeriod ?? UID2.DEFAULT_REFRESH_RETRY_PERIOD_MS;
    if (this._refreshTimerId) {
      clearTimeout(this._refreshTimerId);
    }
    this._refreshTimerId = setTimeout(() => {
      if (this.isLoginRequired()) return;
      const validatedIdentity = this.validateAndSetIdentity(
        this._cookieManager?.loadIdentityFromCookie() ?? null
      );
      if (validatedIdentity) this.triggerRefreshOrSetTimer(validatedIdentity);
      this._refreshTimerId = null;
    }, timeout);
  }

  private refreshToken(identity: Uid2Identity) {
    const apiClient = this._apiClient;
    if (!apiClient)
      throw new Error("Cannot refresh the token before calling init.");

    apiClient
      .callRefreshApi(identity)
      .then(
        (response) => {
          switch (response.status) {
            case "success":
              this.validateAndSetIdentity(
                response.identity,
                IdentityStatus.REFRESHED,
                "Identity refreshed"
              );
              this.setRefreshTimer();
              break;
            case "optout":
              this.validateAndSetIdentity(
                null,
                IdentityStatus.OPTOUT,
                "User opted out"
              );
              break;
            case "expired_token":
              this.validateAndSetIdentity(
                null,
                IdentityStatus.REFRESH_EXPIRED,
                "Refresh token expired"
              );
              break;
          }
        },
        (reason) => {
          console.warn(
            `Encountered an error refreshing the UID2 token`,
            reason
          );
          this.validateAndSetIdentity(identity);
          if (!hasExpired(identity.refresh_expires, Date.now()))
            this.setRefreshTimer();
        }
      )
      .then(
        () => {
          this._callbackManager.runCallbacks(EventType.IdentityUpdated, {});
        },
        (reason) =>
          console.warn(`UID2 callbacks on identity event failed.`, reason)
      );
  }

  private async callCstgAndSetIdentity(
    request: { emailHash: string; } | { phoneHash: string; },
    opts: ClientSideIdentityOptions
  ) {
    const cstgResult = await this._apiClient!.callCstgApi(request, opts);

    this.setIdentity(cstgResult.identity);
  }

  private throwIfInitNotComplete(message: string) {
    if (!this._initComplete) {
      throw new Error(message);
    }
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
  window.__uid2 = new UID2(callbacks);
  if (postUid2CreateCallback) postUid2CreateCallback();
}
__uid2InternalHandleScriptLoad();

export const sdkWindow = globalThis.window;
