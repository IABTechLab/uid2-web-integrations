import { CallbackHandler, UID2 } from '../../src/uid2Sdk';
import { topLevelDomain } from '../siteDetails';

export function isUid2Sdk(sdk: any): sdk is UID2 {
  if (typeof sdk?.init === 'function') return true;
  return false;
}

export function initUid2Sdk(callback?: CallbackHandler) {
  window.__uid2 = window.__uid2 ?? { callbacks: [] };
  window.__uid2.callbacks?.push((event, payload) => {
    if (event === 'SdkLoaded') {
      (window.__uid2 as UID2).init({
        baseUrl: 'https://operator-integ.uidapi.com',
        cookieDomain: topLevelDomain,
        useCookie: true,
      });
    }
    callback?.(event, payload);
  });
}
