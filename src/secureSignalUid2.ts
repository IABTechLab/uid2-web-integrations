import { isDebugModeOn, UidSecureSignalProvider } from './secureSignal_shared';

const INTEG_BASE_URL = 'https://cdn.integ.uidapi.com/';

const retrieveAdvertisingTokenHandler = (): Function | undefined => {
  if (typeof window.getUidAdvertisingToken === 'function') {
    return window.getUidAdvertisingToken!;
  }

  if (window.__uid2 && 'getAdvertisingTokenAsync' in window.__uid2!) {
    return window.__uid2!.getAdvertisingTokenAsync!.bind(window.__uid2);
  }
};

export function __uid2SSProviderScriptLoad() {
  window.__uidSecureSignalProvider = new UidSecureSignalProvider(
    true,
    retrieveAdvertisingTokenHandler
  );
  // For UID2 SDK integration
  window.__uid2 = window.__uid2 || {
    callbacks: [],
  };
  window.__uid2.callbacks?.push((eventType) => {
    //@ts-ignore
    if (eventType === 'SdkLoaded') {
      window.__uidSecureSignalProvider!.registerSecureSignalProvider();
    }
  });
}

__uid2SSProviderScriptLoad();
