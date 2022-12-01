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
      collectorFunction: uid2Handler,
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
    __uid2SecureSignalProvider?: Uid2SecureSignalProvider;
    getUid2AdvertisingToken?: () => Promise<string | null | undefined>;
  }
}

(function () {
  window.__uid2SecureSignalProvider = new Uid2SecureSignalProvider();
  
  // For UID2 SDK integration
  if (window.__uid2) {
    window.__uid2.callbacks?.push(() => {
      //@ts-ignore
      window.__uid2.setupGoogleSecureSignals();
    })
  }
})();
