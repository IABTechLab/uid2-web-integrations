import { isDebugModeOn, UidSecureSignalProvider } from './secureSignal_shared';

const INTEG_BASE_URL = 'https://cdn.integ.uidapi.com/';

declare global {
  interface Window {
    getUid2AdvertisingToken?: () => Promise<string | null | undefined>;
  }
}

export function __uid2SSProviderScriptLoad() {
  window.__uidSecureSignalProvider = new UidSecureSignalProvider(isDebugModeOn(INTEG_BASE_URL));
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
