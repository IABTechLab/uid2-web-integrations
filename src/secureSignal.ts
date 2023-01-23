const MAXIMUM_RETRY = 3;
export class Uid2SecureSignalProvider {
  constructor() {
    if (typeof window.getUid2AdvertisingToken === "function") {
      this.registerSecureSignalProvider();
    }
  }

  public registerSecureSignalProvider = () => {
    const uid2Handler = this.retrieveAdvertisingTokenHandler();

    if (!uid2Handler) {
      console.warn("Please implement `getUid2AdvertisingToken`");
      return;
    }
    window.googletag = window.googletag || {
      cmd: [],
    };
    window.googletag.secureSignalProviders =
      window.googletag.secureSignalProviders || [];
    window.googletag.secureSignalProviders.push({
      id: "uidapi.com",
      collectorFunction: async () => {
        return getUid2AdvertisingTokenWithRetry(uid2Handler);
      },
    });
  };

  private retrieveAdvertisingTokenHandler = (): Function | undefined => {
    if (typeof window.getUid2AdvertisingToken === "function") {
      return window.getUid2AdvertisingToken!;
    }
    if (window.__uid2 && "getAdvertisingTokenAsync" in window.__uid2!) {
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

export function __uid2SSProviderScriptLoad() {
  window.__uid2SecureSignalProvider = new Uid2SecureSignalProvider();
  // For UID2 SDK integration
  window.__uid2 = window.__uid2 || {
    callbacks: [],
  };
  window.__uid2.callbacks?.push((eventType) => {
    //@ts-ignore
    if (eventType === "SdkLoaded") {
      window.__uid2SecureSignalProvider!.registerSecureSignalProvider();
    }
  });
}

__uid2SSProviderScriptLoad();

export function getUid2AdvertisingTokenWithRetry(
  uid2Handler: Function,
  retries: number = MAXIMUM_RETRY
): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    let attempts = 0;

    async function attempt() {
      attempts++;
      return uid2Handler()
        .then(resolve)
        .catch((error: any) => {
          if (attempts >= retries) {
            reject(error);
          } else {
            attempt();
          }
        });
    }

    while (attempts < retries) {
      await attempt();
    }
  });
}
