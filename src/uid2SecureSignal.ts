export class Uid2SecureSignalProvider {
  static UID2_COLLECTOR_ID = "uidapi.com";
  static UID2_SIGNAL_EXPIRATION = 24 * 60 * 60 * 1000;
  static UID2_SS_STORAGE_KEY = Uid2SecureSignalProvider.UID2_COLLECTOR_ID + "__expires";

  constructor() {
    this.updateSecureSignal()
  }

  public isCacheExpired = () => {
    const cache_expires = window.localStorage.getItem(Uid2SecureSignalProvider.UID2_SS_STORAGE_KEY);
    // SecureSignal cache is not yet expired, we don't push any value to it
    if (cache_expires && parseInt(cache_expires) > Date.now()) {
      return false;
    }
    return true
  }

  public updateSecureSignal = async () => {
    if (!this.isCacheExpired()) return

    // Force a token refresh and register the provider with latest token
    if (this.isUID2SDKIntegrated() && "refreshToken" in window.__uid2!) {
      window.__uid2!.forceTokenRefresh();
      return;
    }

    if (
      typeof window.getUid2AdvertisingToken !== "function"
    ) {
      console.warn("Please implement `getUid2AdvertisingToken`");
      return;
    }

    try {
      const token = await window.getUid2AdvertisingToken!();
      this.registerSecureSignalProvider(token);
    } catch (e) {
      console.error(e);
    }
  };

  public registerSecureSignalProvider = (token: string | null | undefined) => {
    if (!token) return;

    window.googletag = window.googletag || {
      cmd: [],
    };
    window.googletag.secureSignalProviders =
      window.googletag.secureSignalProviders || [];
    window.googletag.secureSignalProviders.push({
      id: Uid2SecureSignalProvider.UID2_COLLECTOR_ID,
      collectorFunction: () => {
        window.localStorage.setItem(
          Uid2SecureSignalProvider.UID2_SS_STORAGE_KEY,
          (Date.now() + Uid2SecureSignalProvider.UID2_SIGNAL_EXPIRATION).toString()
        );
        return Promise.resolve(token);
      },
    });
  };

  private isUID2SDKIntegrated = (): boolean => {
    return Boolean(
      window.__uid2 &&
        "secureSignalsEnabled" in window.__uid2 &&
        window.__uid2.secureSignalsEnabled
    );
  };
}

declare global {
  interface Window {
    __uid2Esp: Uid2SecureSignalProvider;
    getUid2AdvertisingToken?: () => Promise<string | null | undefined>;
  }
}

(function () {
  window.__uid2Esp = new Uid2SecureSignalProvider();
})();
