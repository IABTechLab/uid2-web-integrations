import { UID2 } from "./uid2Sdk";
import { isValidIdentity, Uid2Identity } from "./Uid2Identity";
import { UID2CookieManager } from "./uid2CookieManager";
import { UID2LocalStorageManager } from "./uid2LocalStorageManager";
import { Uid2Options } from "./Uid2Options";

export class UID2StorageManager {
  private _cookieManager: UID2CookieManager | undefined;
  private _localStorageManager: UID2LocalStorageManager | undefined;

  private _opts: Uid2Options;
  constructor(opts: Uid2Options) {
    this._opts = opts;
    this._cookieManager = new UID2CookieManager({ ...opts });
    this._localStorageManager = new UID2LocalStorageManager();
  }

  public loadIdentityWithFallback(): Uid2Identity | null {
    const localStorageIdentity = this._localStorageManager?.loadIdentityFromLocalStorage();
    const cookieIdentity = this._cookieManager?.loadIdentityFromCookie();
    const shouldUseCookie = cookieIdentity && (!localStorageIdentity || cookieIdentity.identity_expires > localStorageIdentity.identity_expires);
    return shouldUseCookie ? cookieIdentity : localStorageIdentity ?? null;
  };

  public loadIdentity(): Uid2Identity | null {
    return this._opts.useCookie
      ? this._cookieManager?.loadIdentityFromCookie() ?? null
      : this._localStorageManager?.loadIdentityFromLocalStorage() ?? null;
  }

  public setValue(identity: Uid2Identity) {
    if (this._opts.useCookie) {
      this._cookieManager?.setCookie(identity);
    }
    else if (this._opts.useCookie === false) {
      this._localStorageManager?.setValue(identity);
      if (this._localStorageManager?.loadIdentityFromLocalStorage()) this._cookieManager?.removeCookie();
    } else {
      this._localStorageManager?.setValue(identity);
    }
  }

  public removeValues() {
    this._cookieManager?.removeCookie();
    this._localStorageManager?.removeValue();
  }
}
