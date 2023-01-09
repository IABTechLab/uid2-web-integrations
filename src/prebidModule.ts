import { Uid2ApiClient } from "./uid2ApiClient";
import { Uid2Identity } from "./Uid2Identity";

function getStorageManager(config: any): Storage {
  return {} as Storage;
}

type Storage = {
  cookiesAreEnabled: () => boolean;
  localStorageIsEnabled: () => boolean;
  setCookie: (name: string, value: string) => void;
  getCookie: (name: string) => string;
  setLocalStorage: (name: string, value: any) => void;
  getDataFromLocalStorage: (name: string) => any;
};

const MODULE_NAME = "uid2";
const GVLID = 887;
const LOG_PRE_FIX = "UID2: ";
const ADVERTISING_COOKIE = "__uid2_advertising_token";

function readCookie(): StoredValue | null {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  return storage.cookiesAreEnabled()
    ? (JSON.parse(storage.getCookie(ADVERTISING_COOKIE)) as StoredValue)
    : null;
}

function readServerProvidedCookie(cookieName: string) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  return JSON.parse(storage.getCookie(cookieName)) as Uid2Identity;
}

function readFromLocalStorage(): StoredValue | null {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  return storage.localStorageIsEnabled()
    ? (storage.getDataFromLocalStorage(ADVERTISING_COOKIE) as StoredValue)
    : null;
}

function storeValue(value: any) {
  if (storage.cookiesAreEnabled())
    storage.setCookie(ADVERTISING_COOKIE, JSON.stringify(value));
  else if (storage.localStorageIsEnabled())
    storage.setLocalStorage(ADVERTISING_COOKIE, value);
}

function getStorage() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return getStorageManager({ gvlid: GVLID, moduleName: MODULE_NAME });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const storage = getStorage();

type DecodedUid2 = {
  uid2: {
    id: string;
  };
};

type StoredValue = StoredUid2 | LegacyStoredValue;
type LegacyStoredValue = DecodedUid2;
type StoredUid2 = {
  originalToken: Uid2Identity;
  latestToken: Uid2Identity;
};

type PrebidUid2Config = {
  name: "uid2";
  uid2Token?: Uid2Identity;
  uid2ServerCookie?: string;
  uid2ApiBase?: string;
};

export const uid2IdSubmodule = {
  name: MODULE_NAME,
  gvlid: GVLID,
  decode(value: StoredValue) {
    if ("uid2" in value) return value;
    if (Date.now() < value.latestToken.identity_expires)
      return { uid2: { id: value.latestToken.advertising_token } };
    return null;
  },

  getId(config: PrebidUid2Config) {
    let suppliedToken: Uid2Identity | null = null;
    if ("uid2Token" in config && config.uid2Token) {
      suppliedToken = config.uid2Token;
    } else if ("uid2ServerCookie" in config && config.uid2ServerCookie) {
      suppliedToken = readServerProvidedCookie(config.uid2ServerCookie);
    }

    let storedTokens = readCookie() || readFromLocalStorage();
    if (storedTokens && "uid2" in storedTokens) {
      // Legacy value stored, this must be an old integration. If no token supplied, just use the legacy value.
      if (!suppliedToken) return { id: storedTokens };
      // Otherwise, ignore the legacy value.
      storedTokens = null;
    }

    if (suppliedToken && storedTokens) {
      if (
        storedTokens.originalToken.advertising_token !==
        suppliedToken.advertising_token
      ) {
        // Stored token wasn't originally sourced from the provided token - ignore the stored value.
        storedTokens = null;
      }
    }

    // At this point, any legacy values or superseded stored tokens have been nulled out.
    const newestAvailableToken = storedTokens?.latestToken ?? suppliedToken;
    if (
      !newestAvailableToken ||
      Date.now() > newestAvailableToken.refresh_expires
    ) {
      // Newest available token is expired and not refreshable.
      return { id: null };
    }

    if (Date.now() > newestAvailableToken?.refresh_from) {
      // Not expired but should try to refresh.
      const apiClient = new Uid2ApiClient({ baseUrl: config.uid2ApiBase });
      const promise = apiClient.callRefreshApi(newestAvailableToken);
      return {
        callback: (cb: any) => {
          // TODO: Store the new thing
          // eslint-disable-next-line @typescript-eslint/no-floating-promises, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
          promise.then((result) => cb(result));
        },
      };
    }

    const newId = {
      id: {
        originalToken: suppliedToken,
        latestToken: suppliedToken,
      },
    };
    storeValue(newId);
    return newId;
  },
};
