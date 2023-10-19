const MAXIMUM_RETRY = 3;
const INTEG_BASE_URL = 'https://cdn.integ.uidapi.com/';
export class Uid2SecureSignalProvider {
  debug: boolean;
  constructor(debug = false) {
    this.debug = debug;

    if (typeof window.getUid2AdvertisingToken === 'function') {
      this.logging('register SecureSignalProvider');
      this.registerSecureSignalProvider();
    }
  }

  public registerSecureSignalProvider = () => {
    const uid2Handler = this.retrieveAdvertisingTokenHandler();

    if (!uid2Handler) {
      console.warn('Uid2SecureSignal: Please implement `getUid2AdvertisingToken`');
      return;
    }

    window.googletag = window.googletag || {
      cmd: [],
    };

    window.googletag.secureSignalProviders = window.googletag.secureSignalProviders || [];
    window.googletag.secureSignalProviders.push({
      id: 'uidapi.com',
      collectorFunction: async () => {
        this.logging('collectorFunction invoked');
        const uid2AdvertisingToken = await getUid2AdvertisingTokenWithRetry(uid2Handler);
        this.logging(`collectorFunction pushes: ${uid2AdvertisingToken}`);
        return uid2AdvertisingToken;
      },
    });
  };

  public logging = (message: string) => {
    if (!this.debug) return;
    console.log(`Uid2SecureSignal: ${message}`);
  };

  private retrieveAdvertisingTokenHandler = (): Function | undefined => {
    if (typeof window.getUid2AdvertisingToken === 'function') {
      return window.getUid2AdvertisingToken!;
    }
    if (window.__uid2 && 'getAdvertisingTokenAsync' in window.__uid2!) {
      return window.__uid2!.getAdvertisingTokenAsync!.bind(window.__uid2);
    }
  };
}

declare global {
  interface Window {
    googletag?: any;
    __uid2SecureSignalProvider?: Uid2SecureSignalProvider;
    getUid2AdvertisingToken?: () => Promise<string | null | undefined>;
  }
}

function isDebugModeOn() {
  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('uid2_ss_debug');
  return (
    debugParam?.toLocaleUpperCase() === 'TRUE' ||
    (document.currentScript as HTMLScriptElement)?.src.startsWith(INTEG_BASE_URL)
  );
}

export function __uid2SSProviderScriptLoad() {
  window.__uid2SecureSignalProvider = new Uid2SecureSignalProvider(isDebugModeOn());
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

export function getUid2AdvertisingTokenWithRetry(
  uid2Handler: Function,
  retries: number = MAXIMUM_RETRY,
): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    let attempts = 0;

    async function attempt(error?: unknown) {
      if (attempts >= retries) {
        window.__uid2SecureSignalProvider?.logging(
          `getUid2AdvertisingTokenWithRetry failed with error after retry: ${error}`,
        );

        reject(error);
        return;
      }

      attempts++;

      try {
        const result = await uid2Handler();
        window.__uid2SecureSignalProvider?.logging(
          `getUid2AdvertisingTokenWithRetry resolved with: ${result}`,
        );
        resolve(result);
      } catch (error) {
        window.__uid2SecureSignalProvider?.logging(
          `getUid2AdvertisingTokenWithRetry failed with error: ${error}`,
        );
        attempt(error);
      }
    }

    attempt();
  });
}
