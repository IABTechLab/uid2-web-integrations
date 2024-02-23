import { UID2CookieManager } from './uid2CookieManager';
import { OptoutIdentity, Uid2Identity } from './Uid2Identity';
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

  public loadIdentityWithFallback(): Uid2Identity | OptoutIdentity | null {
    const localStorageIdentity = this._localStorageManager.loadIdentityFromLocalStorage();
    const cookieIdentity = this._cookieManager.loadIdentityFromCookie();
    const shouldUseCookie =
      cookieIdentity &&
      (!localStorageIdentity ||
        cookieIdentity.identity_expires > localStorageIdentity.identity_expires);
    return shouldUseCookie ? cookieIdentity : localStorageIdentity;
  }

  public loadIdentity(): Uid2Identity | OptoutIdentity | null {
    return this._opts.useCookie
      ? this._cookieManager.loadIdentityFromCookie()
      : this._localStorageManager.loadIdentityFromLocalStorage();
  }

  public setIdentity(identity: Uid2Identity) {
    this.setValue(identity);
  }

  public setOptout() {
    const expiry = Date.now() + 72 * 60 * 60 * 1000; // 3 days - need to pick something
    const optout: OptoutIdentity = {
      refresh_expires: expiry,
      identity_expires: expiry,
      status: 'optout',
    };
    this.setValue(optout);
  }

  private setValue(value: Uid2Identity | OptoutIdentity) {
    if (this._opts.useCookie) {
      this._cookieManager.setCookie(value);
      return;
    }

    this._localStorageManager.setValue(value);
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
