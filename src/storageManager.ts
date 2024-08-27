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
    const cookieIdentity = this._cookieManager.loadIdentityFromCookie();
    const localStorageIdentity = this._localStorageManager.loadIdentityFromLocalStorage();
    if (cookieIdentity !== null) {
      return this._cookieManager.loadIdentityFromCookie();
    } else {
      return this._localStorageManager.loadIdentityFromLocalStorage();
    }

    // return this._opts.useCookie
    //   ? this._cookieManager.loadIdentityFromCookie()
    //   : this._localStorageManager.loadIdentityFromLocalStorage();
  }

  public setIdentity(identity: Identity) {
    this.setValue(identity);
  }

  public updateValue(opts: SdkOptions, cookieName: string, previousOpts: SdkOptions) {
    if (opts.identity) {
      if (previousOpts.useCookie === true) {
        this._cookieManager.removeCookie(previousOpts);
      } else if (!previousOpts || previousOpts.useCookie === false) {
        this._localStorageManager.removeValue();
      }
      this._cookieManager = new CookieManager({ ...opts }, cookieName);
      this.setValue(opts.identity);
    }
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
    if (!this._opts.useCookie && this._localStorageManager.loadIdentityFromLocalStorage()) {
      this._cookieManager.removeCookie(this._opts);
    }
  }

  public removeValues() {
    this._cookieManager.removeCookie(this._opts);
    this._localStorageManager.removeValue();
  }
}
