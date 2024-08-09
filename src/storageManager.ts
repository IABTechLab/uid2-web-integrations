import { CookieManager } from './cookieManager';
import { OptoutIdentity, Identity } from './Identity';
import { LocalStorageManager } from './localStorageManager';
import { SdkOptions } from './sdkOptions';

export class StorageManager {
  private _cookieManager: CookieManager;
  private _localStorageManager: LocalStorageManager;

  private _opts: SdkOptions;
  constructor(opts: SdkOptions, cookieName: string, localStorageKey: string) {
    this._opts = opts;
    this._cookieManager = new CookieManager({ ...opts }, cookieName);
    this._localStorageManager = new LocalStorageManager(localStorageKey);
  }

  public loadIdentityWithFallback(): Identity | OptoutIdentity | null {
    const localStorageIdentity = this._localStorageManager.loadIdentityFromLocalStorage();
    const cookieIdentity = this._cookieManager.loadIdentityFromCookie();
    const shouldUseCookie =
      cookieIdentity &&
      (!localStorageIdentity ||
        cookieIdentity.identity_expires > localStorageIdentity.identity_expires);
    return shouldUseCookie ? cookieIdentity : localStorageIdentity;
  }

  public loadIdentity(): Identity | OptoutIdentity | null {
    return this._opts.useCookie
      ? this._cookieManager.loadIdentityFromCookie()
      : this._localStorageManager.loadIdentityFromLocalStorage();
  }

  public setIdentity(identity: Identity) {
    this.setValue(identity);
  }

  public updateCookieOptions(opts: SdkOptions, cookieName: string) {
    this._cookieManager = new CookieManager({ ...opts }, cookieName);
  }

  public updateUseCookie(useCookie: boolean) {
    this._opts.useCookie = useCookie;
    this.loadIdentity();
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

  private setValue(value: Identity | OptoutIdentity) {
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
