import { isDebugModeOn, UidSecureSignalProvider } from './secureSignal_shared';
import { UidSecureSignalProviderType } from './secureSignal_types';

const INTEG_BASE_URL = 'https://cdn.integ.uidapi.com/';

declare global {
  interface Window {
    getUid2AdvertisingToken?: () => Promise<string | null | undefined>;
    __uid2SecureSignalProvider?: UidSecureSignalProviderType;
  }
}

export function __uid2SSProviderScriptLoad() {
  window.__uid2SecureSignalProvider = new UidSecureSignalProvider(isDebugModeOn(INTEG_BASE_URL));
  // For UID2 SDK integration
  window.__uid2 = window.__uid2 || {
    callbacks: [],
  };
  window.__uid2.callbacks?.push((eventType) => {
    //@ts-ignore
    if (eventType === 'SdkLoaded') {
      window.__uid2SecureSignalProvider!.registerSecureSignalProvider();
    }
  });
}

__uid2SSProviderScriptLoad();
