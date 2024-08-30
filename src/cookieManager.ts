import { isValidIdentity, Identity, OptoutIdentity, isOptoutIdentity } from './Identity';
import { SdkOptions } from './sdkOptions';

export type CookieOptions = {
  cookieDomain?: string;
  cookiePath?: string;
};
type LegacySDKCookie = Omit<Identity, 'refresh_from' | 'refresh_expires' | 'identity_expires'>;

export function isLegacyCookie(cookie: unknown): cookie is LegacySDKCookie {
  if (typeof cookie !== 'object' || !cookie) return false;
  const partialCookie = cookie as Partial<LegacySDKCookie>;
  if (
    'advertising_token' in partialCookie &&
    'refresh_token' in partialCookie &&
    partialCookie.advertising_token &&
    partialCookie.refresh_token
  )
    return true;
  return false;
}

function enrichIdentity(identity: LegacySDKCookie, now: number) {
  return {
    refresh_from: now,
    refresh_expires: now + 7 * 86400 * 1000, // 7 days
    identity_expires: now + 4 * 3600 * 1000, // 4 hours
    ...identity,
  };
}

function getCookie(cookieName: string) {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie.split('; ').find((row) => row.startsWith(cookieName + '='));
    if (payload) {
      return decodeURIComponent(payload.split('=')[1]);
    }
  }
}

export function loadIdentityFromCookieNoInit(cookieName: string): Identity | OptoutIdentity | null {
  const payload = getCookie(cookieName);
  if (payload) {
    const result = JSON.parse(payload) as unknown;
    if (isValidIdentity(result)) return result;
    if (isOptoutIdentity(result)) return result;
    if (isLegacyCookie(result)) {
      return enrichIdentity(result, Date.now());
    }
  }
  return null;
}

export class CookieManager {
  private _opts: CookieOptions;
  private _cookieName: string;
  constructor(opts: CookieOptions, cookieName: string) {
    this._cookieName = cookieName;
    this._opts = opts;
  }
  public setCookie(identity: Identity | OptoutIdentity) {
    const value = JSON.stringify(identity);
    const expires = new Date(identity.refresh_expires);
    const path = this._opts.cookiePath ?? '/';
    let cookie =
      this._cookieName +
      '=' +
      encodeURIComponent(value) +
      ' ;path=' +
      path +
      ';expires=' +
      expires.toUTCString();
    if (typeof this._opts.cookieDomain !== 'undefined') {
      cookie += ';domain=' + this._opts.cookieDomain;
    }
    document.cookie = cookie;
  }
  public removeCookie(previousOptions: SdkOptions) {
    document.cookie =
      this._cookieName +
      '=;path=' +
      (previousOptions.cookiePath ?? '/') +
      ';domain=' +
      (previousOptions.cookieDomain ?? '') +
      ';expires=Tue, 1 Jan 1980 23:59:59 GMT';
  }
  private getCookie() {
    return getCookie(this._cookieName);
  }

  private migrateLegacyCookie(identity: LegacySDKCookie, now: number): Identity {
    const newCookie = enrichIdentity(identity, now);
    this.setCookie(newCookie);
    return newCookie;
  }

  public loadIdentityFromCookie(): Identity | OptoutIdentity | null {
    const payload = this.getCookie();
    if (payload) {
      const result = JSON.parse(payload) as unknown;
      if (isValidIdentity(result)) return result;
      if (isOptoutIdentity(result)) return result;
      if (isLegacyCookie(result)) {
        return this.migrateLegacyCookie(result, Date.now());
      }
    }
    return null;
  }
}
