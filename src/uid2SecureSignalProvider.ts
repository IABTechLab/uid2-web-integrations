export class Uid2SecureSignalProvider {
  constructor() {
    if (
      typeof window.getUid2AdvertisingToken === "function" ||
      // if the SDK has been initialized before this script loaded and enabled esp, the token will be
      // send automatically as it might missed initComplete event 
      this.isUID2SDKIntegrated()
    ) {
      this.registerSecureSignalProvider();
    }
  }

  public registerSecureSignalProvider = () => {
    const uid2Handler = this.retrieveAdvertisingTokenHandler();

    if (!uid2Handler) {
      console.warn("Please implement `getUid2AdvertisingToken`");
      return;
    }

    if (uid2Handler()) {
      window.googletag = window.googletag || {
        cmd: [],
      };
      window.googletag.secureSignalProviders =
        window.googletag.secureSignalProviders || [];
      window.googletag.secureSignalProviders.push({
        id: "uidapi.com",
        collectorFunction: () => Promise.resolve(uid2Handler()),
      });
    }
  };

  private isUID2SDKIntegrated = (): boolean => {
    return Boolean(
      window.__uid2 &&
      "espEnabled" in window.__uid2 &&
      window.__uid2.espEnabled
    );
  };

  private retrieveAdvertisingTokenHandler = (): Function | undefined => {
    if (typeof window.getUid2AdvertisingToken === "function") {
      return window.getUid2AdvertisingToken!;
    }
    if (this.isUID2SDKIntegrated() && 'getAdvertisingToken' in window.__uid2!) {
      return window.__uid2!.getAdvertisingToken!.bind(window.__uid2);
    }
  };
}

declare global {
  interface Window {
    __uid2Esp: Uid2SecureSignalProvider;
    getUid2AdvertisingToken?: () => string | null | undefined;
  }
}

(function () {
  window.__uid2Esp = new Uid2SecureSignalProvider();
})();
