import { isDebugModeOn, UidSecureSignalProvider } from './secureSignal_shared';

const INTEG_BASE_URL = 'https://cdn.integ.euid.eu/';

declare global {
  interface Window {
    getEuidAdvertisingToken?: () => Promise<string | null | undefined>;
  }
}

export function __euidSSProviderScriptLoad() {
  window.__uidSecureSignalProvider = new UidSecureSignalProvider(
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
      window.__uidSecureSignalProvider!.registerSecureSignalProvider();
    }
  });
}

__euidSSProviderScriptLoad();
