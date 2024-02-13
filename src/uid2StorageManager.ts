import { UID2CookieManager } from './uid2CookieManager';
import { Uid2Identity } from './Uid2Identity';
import { UID2LocalStorageManager } from './uid2LocalStorageManager';
import { Uid2Options } from './Uid2Options';

export class UID2StorageManager {
  private _cookieManager: UID2CookieManager;
  private _localStorageManager: UID2LocalStorageManager;

  private _opts: Uid2Options;
  constructor(opts: Uid2Options, cookieName: string, localStorageKey: string) {
    this._opts = opts;
    this._cookieManager = new UID2CookieManager({ ...opts }, cookieName);
    this._localStorageManager = new UID2LocalStorageManager(localStorageKey);
  }

  public loadIdentityWithFallback(): Uid2Identity | null {
    const localStorageIdentity = this._localStorageManager.loadIdentityFromLocalStorage();
    const cookieIdentity = this._cookieManager.loadIdentityFromCookie();
    const shouldUseCookie =
      cookieIdentity &&
      (!localStorageIdentity ||
        cookieIdentity.identity_expires > localStorageIdentity.identity_expires);
    return shouldUseCookie ? cookieIdentity : localStorageIdentity;
  }

  public loadIdentity(): Uid2Identity | null {
    return this._opts.useCookie
      ? this._cookieManager.loadIdentityFromCookie()
      : this._localStorageManager.loadIdentityFromLocalStorage();
  }

  public setValue(identity: Uid2Identity) {
    if (this._opts.useCookie) {
      this._cookieManager.setCookie(identity);
      return;
    }

    this._localStorageManager.setValue(identity);
    if (
      this._opts.useCookie === false &&
      this._localStorageManager.loadIdentityFromLocalStorage()
    ) {
      this._cookieManager.removeCookie();
    }
  }

  public removeValues() {
    this._cookieManager.removeCookie();
    this._localStorageManager.removeValue();
  }
}
