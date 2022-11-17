export class UID2EncryptedSignalProvider {
  constructor() {
    if (
      typeof window.getAdvertisingToken === "function" ||
      // if the SDK has been initialized before this script loaded and enabled esp, the token will be
      // send automatically as it might missed initComplete event 
      this.isUID2SDKIntegrated()
    ) {
      this.sendSignal();
    }
  }

  public sendSignal = () => {
    const uid2Handler = this.retrieveAdvertisingTokenHandler();

    if (!uid2Handler) {
      console.warn("Please implement `getAdvertisingToken`");
      return;
    }

    if (uid2Handler()) {
      window.googletag = window.googletag || {
        cmd: [],
      };
      window.googletag.encryptedSignalProviders =
        window.googletag.encryptedSignalProviders || [];
      window.googletag.encryptedSignalProviders.push({
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
    if (typeof window.getAdvertisingToken === "function") {
      return window.getAdvertisingToken!;
    }
    if (this.isUID2SDKIntegrated() && 'getAdvertisingToken' in window.__uid2!) {
      return window.__uid2!.getAdvertisingToken!.bind(window.__uid2);
    }
  };
}

declare global {
  interface Window {
    __uid2Esp: UID2EncryptedSignalProvider;
    getAdvertisingToken?: () => string;
  }
}

(function () {
  window.__uid2Esp = new UID2EncryptedSignalProvider();
})();
