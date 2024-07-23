const MAXIMUM_RETRY = 3;
export class UidSecureSignalProvider {
  debug: boolean;
  retrieveAdvertisingTokenHandler: Function;

  constructor(debug = false, retrieveAdvertisingTokenHandler: Function) {
    this.debug = debug;
    this.retrieveAdvertisingTokenHandler = retrieveAdvertisingTokenHandler;

    if (typeof window.getUidAdvertisingToken === 'function') {
      this.logging('register SecureSignalProvider');
      this.registerSecureSignalProvider();
    }
  }

  public registerSecureSignalProvider = () => {
    const uidHandler = this.retrieveAdvertisingTokenHandler();

    if (!uidHandler) {
      console.warn('UidSecureSignal: Please implement `getUidAdvertisingToken`');
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
        const uidAdvertisingToken = await getUidAdvertisingTokenWithRetry(uidHandler);
        this.logging(`collectorFunction pushes: ${uidAdvertisingToken}`);
        return uidAdvertisingToken;
      },
    });
  };

  public logging = (message: string) => {
    if (!this.debug) return;
    console.log(`UidSecureSignal: ${message}`);
  };
}

declare global {
  interface Window {
    googletag?: any;
    __uidSecureSignalProvider?: UidSecureSignalProvider;
    getUidAdvertisingToken?: () => Promise<string | null | undefined>;
  }
}

export function isDebugModeOn(urlTest: string) {
  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('uid2_ss_debug');
  return (
    debugParam?.toLocaleUpperCase() === 'TRUE' ||
    (document.currentScript as HTMLScriptElement)?.src.startsWith(urlTest)
  );
}

export function getUidAdvertisingTokenWithRetry(
  uidHandler: Function,
  retries: number = MAXIMUM_RETRY
): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    let attempts = 0;

    async function attempt(error?: unknown) {
      if (attempts >= retries) {
        window.__uidSecureSignalProvider?.logging(
          `getUid2AdvertisingTokenWithRetry failed with error after retry: ${error}`
        );

        reject(error);
        return;
      }

      attempts++;

      try {
        const result = await uidHandler();
        window.__uidSecureSignalProvider?.logging(
          `getUid2AdvertisingTokenWithRetry resolved with: ${result}`
        );
        resolve(result);
      } catch (error) {
        window.__uidSecureSignalProvider?.logging(
          `getUid2AdvertisingTokenWithRetry failed with error: ${error}`
        );
        attempt(error);
      }
    }

    attempt();
  });
}
