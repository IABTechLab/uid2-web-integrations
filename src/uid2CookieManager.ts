import { isValidIdentity, Uid2Identity, OptoutIdentity, isOptoutIdentity } from './Uid2Identity';

export type UID2CookieOptions = {
  cookieDomain?: string;
  cookiePath?: string;
};
type LegacyUid2SDKCookie = Omit<
  Uid2Identity,
  'refresh_from' | 'refresh_expires' | 'identity_expires'
>;

export function isLegacyCookie(cookie: unknown): cookie is LegacyUid2SDKCookie {
  if (typeof cookie !== 'object' || !cookie) return false;
  const partialCookie = cookie as Partial<LegacyUid2SDKCookie>;
  if (
    'advertising_token' in partialCookie &&
    'refresh_token' in partialCookie &&
    partialCookie.advertising_token &&
    partialCookie.refresh_token
  )
    return true;
  return false;
}

function enrichIdentity(identity: LegacyUid2SDKCookie, now: number) {
  return {
    refresh_from: now,
    refresh_expires: now + 7 * 86400 * 1000, // 7 days
    identity_expires: now + 4 * 3600 * 1000, // 4 hours
    ...identity,
  };
}

export class UID2CookieManager {
  private _opts: UID2CookieOptions;
  private _cookieName: string;
  constructor(opts: UID2CookieOptions, cookieName: string) {
    this._cookieName = cookieName;
    this._opts = opts;
  }
  public setCookie(identity: Uid2Identity | OptoutIdentity) {
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
  public removeCookie() {
    document.cookie = this._cookieName + '=;expires=Tue, 1 Jan 1980 23:59:59 GMT';
  }
  private getCookie() {
    const docCookie = document.cookie;
    if (docCookie) {
      const payload = docCookie.split('; ').find((row) => row.startsWith(this._cookieName + '='));
      if (payload) {
        return decodeURIComponent(payload.split('=')[1]);
      }
    }
  }

  private migrateLegacyCookie(identity: LegacyUid2SDKCookie, now: number): Uid2Identity {
    const newCookie = enrichIdentity(identity, now);
    this.setCookie(newCookie);
    return newCookie;
  }

  public loadIdentityFromCookie(): Uid2Identity | OptoutIdentity | null {
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
