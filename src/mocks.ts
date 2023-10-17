import * as jsdom from "jsdom";
import { Cookie } from "tough-cookie";
import { UID2 } from "./uid2Sdk";
import { Uid2Identity } from "./Uid2Identity";
import { localStorageKeyName } from "./uid2LocalStorageManager";
import { base64ToBytes, bytesToBase64 } from "./uid2Base64";

export class CookieMock {
  jar: jsdom.CookieJar;
  url: string;
  set: (value: string | Cookie) => Cookie;
  get: () => string;
  getSetCookieString: (name: string) => string;
  applyTo: (document: Document) => void;
  constructor(document: Document) {
    this.jar = new jsdom.CookieJar();
    this.url = document.URL;
    this.set = (value: string | Cookie) => this.jar.setCookieSync(value, this.url, { http: false });
    this.get = () => this.jar.getCookieStringSync(this.url, { http: false });
    this.getSetCookieString = (name: string) => {
      return this.jar.getSetCookieStringsSync(this.url).filter((c) => c.startsWith(name + "="))[0];
    };
    this.applyTo = (document: Document) => {
      jest.spyOn(document, "cookie", "get").mockImplementation(() => this.get());
      jest.spyOn(document, "cookie", "set").mockImplementation((value) => this.set(value));
    };

    this.applyTo(document);
  }
}

type MockApiResponse = {
  identity?: Uid2Identity;
  responseText?: string;
  status?: number;
};
export class XhrMock {
  responseText: string;
  onreadystatechange: any;
  open: jest.Mock<any, any>;
  send: jest.Mock<any, any>;
  abort: jest.Mock<any, any>;
  overrideMimeType: jest.Mock<any, any>;
  setRequestHeader: jest.Mock<any, any>;
  status: number;
  readyState: number;
  applyTo: (window: any) => void;
  get DONE() {
    return 4;
  }

  async sendRefreshApiResponse(identity: Uid2Identity, previousRefreshResponseToken: string) {
    const refreshKey = await crypto.subtle.importKey(
      "raw",
      base64ToBytes(previousRefreshResponseToken),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Mock the response data as an object
    const responseData = { status: "success", body: identity };

    // Encrypt the response data
    const textEncoder = new TextEncoder();
    const plaintext = textEncoder.encode(JSON.stringify(responseData));

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: 128,
      },
      refreshKey,
      plaintext
    );
    // Combine the IV and ciphertext, and encode it as base64
    const combinedData = new Uint8Array(iv.length + ciphertext.byteLength);
    combinedData.set(iv, 0);
    combinedData.set(new Uint8Array(ciphertext), iv.length);

    const encodedResponse = bytesToBase64(combinedData);

    // Assign the encoded response to this.responseText
    this.responseText = encodedResponse;
    this.onreadystatechange(new Event(""));
  }

  sendCstgApiResponse(override?: MockApiResponse) {
    this.status = override?.status || 200;
    this.responseText =
      override?.responseText ||
      btoa(JSON.stringify({ status: "success", body: override?.identity }));
  }

  constructor(window: Window) {
    this.open = jest.fn();
    this.send = jest.fn();
    this.abort = jest.fn();
    this.overrideMimeType = jest.fn();
    this.setRequestHeader = jest.fn();
    this.status = 200;
    this.responseText = btoa("response_text");
    this.readyState = this.DONE;
    this.applyTo = (window) => {
      jest.spyOn(window, "XMLHttpRequest").mockImplementation(() => this);
    };

    this.applyTo(window);
  }
}

export function setupFakeTime() {
  jest.useFakeTimers();
  jest.spyOn(global, "setTimeout");
  jest.spyOn(global, "clearTimeout");
  jest.setSystemTime(new Date("2021-10-01"));
}

export function resetFakeTime() {
  const mockSetTimeout = setTimeout as unknown as jest.Mock;
  const mockClearTimeout = clearTimeout as jest.Mock;
  mockSetTimeout.mockClear();
  mockClearTimeout.mockClear();
  jest.clearAllTimers();
  jest.setSystemTime(new Date("2021-10-01"));
}

export function setCookieMock(document: Document) {
  return new CookieMock(document);
}

export function setUid2Cookie(value: any) {
  document.cookie = UID2.COOKIE_NAME + "=" + encodeURIComponent(JSON.stringify(value));
}

export function removeUid2Cookie() {
  document.cookie = document.cookie + "=;expires=Tue, 1 Jan 1980 23:59:59 GMT";
}

export async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

export function getUid2(useCookie?: boolean) {
  return useCookie ? getUid2Cookie() : getUid2LocalStorage();
}

export function setUid2(value: any, useCookie?: boolean) {
  return useCookie ? setUid2Cookie(value) : setUid2LocalStorage(value);
}

export function getUid2Cookie() {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie.split("; ").find((row) => row.startsWith(UID2.COOKIE_NAME + "="));
    if (payload) {
      return JSON.parse(decodeURIComponent(payload.split("=")[1]));
    }
  }
  return null;
}

export function removeUid2LocalStorage() {
  localStorage.removeItem(localStorageKeyName);
}

export function setUid2LocalStorage(identity: any) {
  const value = JSON.stringify(identity);
  localStorage.setItem(localStorageKeyName, value);
}

export function getUid2LocalStorage() {
  const value = localStorage.getItem(localStorageKeyName);
  return value !== null ? JSON.parse(value) : null;
}

export function setEuidCookie(value: any) {
  document.cookie = "__euid" + "=" + encodeURIComponent(JSON.stringify(value));
}

export function getEuidCookie() {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie.split("; ").find((row) => row.startsWith("__euid" + "="));
    if (payload) {
      return JSON.parse(decodeURIComponent(payload.split("=")[1]));
    }
  }
}

export function makeIdentityV1(overrides?: any) {
  return {
    advertising_token: "test_advertising_token",
    refresh_token: "test_refresh_token",
    refresh_from: Date.now() + 100000,
    identity_expires: Date.now() + 200000,
    refresh_expires: Date.now() + 300000,
    ...(overrides || {}),
  };
}

export function makeIdentityV2(overrides = {}) {
  return {
    advertising_token: "test_advertising_token",
    refresh_token: "test_refresh_token",
    refresh_response_key: bytesToBase64(crypto.getRandomValues(new Uint8Array(32))),
    refresh_from: Date.now() + 100000,
    identity_expires: Date.now() + 200000,
    refresh_expires: Date.now() + 300000,
    ...(overrides || {}),
  };
}

export function makeCstgOption(overrides?: any) {
  return {
    serverPublicKey:
      "UID2-X-L-24B8a/eLYBmRkXA9yPgRZt+ouKbXewG2OPs23+ov3JC8mtYJBCx6AxGwJ4MlwUcguebhdDp2CvzsCgS9ogwwGA==",
    subscriptionId: "subscription-id",
    ...(overrides || {}),
  };
}
