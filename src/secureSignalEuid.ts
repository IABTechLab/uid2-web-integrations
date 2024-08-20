import { isDebugModeOn, UidSecureSignalProvider } from './secureSignal_shared';
import { UidSecureSignalProviderType } from './secureSignal_types';

const INTEG_BASE_URL = 'https://cdn.integ.euid.eu/';

declare global {
  interface Window {
    getEuidAdvertisingToken?: () => Promise<string | null | undefined>;
    __euidSecureSignalProvider?: UidSecureSignalProviderType;
  }
}

export function __euidSSProviderScriptLoad() {
  window.__euidSecureSignalProvider = new UidSecureSignalProvider(
    isDebugModeOn(INTEG_BASE_URL),
    true
  );
  // For UID2 SDK integration
  window.__euid = window.__euid || {
    callbacks: [],
  };
  window.__euid.callbacks?.push((eventType) => {
    //@ts-ignore
    if (eventType === 'SdkLoaded') {
      window.__euidSecureSignalProvider!.registerSecureSignalProvider();
    }
  });
}

__euidSSProviderScriptLoad();
