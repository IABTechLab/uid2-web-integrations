const MAXIMUM_RETRY = 3;
export class UidSecureSignalProvider {
  debug: boolean;

  constructor(debug = false) {
    this.debug = debug;

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

  private retrieveAdvertisingTokenHandler = (): Function | undefined => {
    if (typeof window.getUidAdvertisingToken === 'function') {
      return window.getUidAdvertisingToken!;
    }

    if (window.__uid2 && 'getAdvertisingTokenAsync' in window.__uid2!) {
      return window.__uid2!.getAdvertisingTokenAsync!.bind(window.__uid2);
    } else if (window.__euid && 'getAdvertisingTokenAsync' in window.__euid!) {
      return window.__euid!.getAdvertisingTokenAsync!.bind(window.__euid);
    }
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
          `getUidAdvertisingTokenWithRetry failed with error after retry: ${error}`
        );

        reject(error);
        return;
      }

      attempts++;

      try {
        const result = await uidHandler();
        window.__uidSecureSignalProvider?.logging(
          `getUidAdvertisingTokenWithRetry resolved with: ${result}`
        );
        resolve(result);
      } catch (error) {
        window.__uidSecureSignalProvider?.logging(
          `getUidAdvertisingTokenWithRetry failed with error: ${error}`
        );
        attempt(error);
      }
    }

    attempt();
  });
}
