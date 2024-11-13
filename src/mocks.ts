import * as jsdom from 'jsdom';
import { Cookie } from 'tough-cookie';
import { UID2 } from './uid2Sdk';
import { Identity } from './Identity';
import { base64ToBytes, bytesToBase64 } from './encoding/base64';
import * as crypto from 'crypto';

const uid2LocalStorageKeyName = 'UID2-sdk-identity';
const euidLocalStorageKeyName = 'EUID-sdk-identity';

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
      return this.jar.getSetCookieStringsSync(this.url).filter((c) => c.startsWith(name + '='))[0];
    };
    this.applyTo = (document: Document) => {
      jest.spyOn(document, 'cookie', 'get').mockImplementation(() => this.get());
      jest.spyOn(document, 'cookie', 'set').mockImplementation((value) => this.set(value));
    };

    this.applyTo(document);
  }
}
type MockXhrResponse = {
  status?: number;
  responseText: string;
};

type MockApiResponse = {
  body?: Identity;
  status?: string;
  message?: string;
};
export const NAME_CURVE = 'P-256';

type MockedKeyBundleForDeriving = {
  clientPublicKey: ArrayBuffer;
  serverPrivateKey: CryptoKey;
};
async function deriveSharedKey(keyBundle: MockedKeyBundleForDeriving): Promise<CryptoKey> {
  const importedPublicKey = await crypto.subtle.importKey(
    'spki',
    keyBundle.clientPublicKey,
    { name: 'ECDH', namedCurve: NAME_CURVE },
    false,
    []
  );
  return await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: importedPublicKey,
    },
    keyBundle.serverPrivateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function decryptClientRequest(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  additionalData: Uint8Array,
  keyBundle: MockedKeyBundleForDeriving
): Promise<string> {
  const sharedKey = await deriveSharedKey(keyBundle);
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData,
    },
    sharedKey,
    ciphertext
  );
  return String.fromCharCode(...new Uint8Array(decryptedData));
}

export async function encryptServerMessage(
  plaintext: string,
  iv: Uint8Array,
  keyBundle: MockedKeyBundleForDeriving
): Promise<ArrayBuffer> {
  const sharedKey = await deriveSharedKey(keyBundle);
  const encoder = new TextEncoder();
  return crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    sharedKey,
    encoder.encode(plaintext)
  );
}

export const importRefreshKey = (refreshResponseKey: string) => {
  return crypto.subtle.importKey(
    'raw',
    base64ToBytes(refreshResponseKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

const generateEncryptedApiResponse = async (response: MockApiResponse, cryptoKey: CryptoKey) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const textEncoder = new TextEncoder();
  const plaintext = textEncoder.encode(JSON.stringify(response));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    cryptoKey,
    plaintext
  );

  const combinedData = new Uint8Array(iv.length + ciphertext.byteLength);

  combinedData.set(iv, 0);
  combinedData.set(new Uint8Array(ciphertext), iv.length);

  return bytesToBase64(combinedData);
};

type MockedCSTGResponse = {
  status?: 'success' | 'client_error' | 'invalid_http_origin';
  body?: Identity;
  message?: string;
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

  async sendEncodedRefreshApiResponse(status: string, currentRefreshResponseToken: string) {
    const refreshKey = await importRefreshKey(currentRefreshResponseToken);
    const encryptedResponse = await generateEncryptedApiResponse({ status }, refreshKey);
    return this.sendApiResponse({ responseText: encryptedResponse });
  }

  async sendIdentityInEncodedResponse(
    identity: Identity,
    currentRefreshResponseToken: string,
    status?: string
  ) {
    const refreshKey = await importRefreshKey(currentRefreshResponseToken);
    const encryptedResponse = await generateEncryptedApiResponse(
      { body: identity, status: status ?? 'success' },
      refreshKey
    );

    return this.sendApiResponse({ responseText: encryptedResponse });
  }

  async sendEncryptedCSTGResponse(
    keyBundle: MockedKeyBundleForDeriving,
    response: MockedCSTGResponse
  ) {
    const sharedKey = await deriveSharedKey(keyBundle);
    const encryptedResponse = await generateEncryptedApiResponse(response, sharedKey);
    return this.sendApiResponse({ responseText: encryptedResponse });
  }

  async sendApiResponse(response: MockXhrResponse) {
    this.status = response.status || 200;
    this.responseText = response.responseText;
    this.onreadystatechange(new Event(''));
  }

  constructor(window: Window) {
    this.open = jest.fn();
    this.send = jest.fn();
    this.abort = jest.fn();
    this.overrideMimeType = jest.fn();
    this.setRequestHeader = jest.fn();
    this.status = 200;
    this.responseText = btoa('response_text');
    this.readyState = this.DONE;
    this.applyTo = (window) => {
      jest.spyOn(window, 'XMLHttpRequest').mockImplementation(() => this);
    };

    this.applyTo(window);
  }
}

export class CryptoMock {
  decryptOutput: string;
  getRandomValues: jest.Mock<any, any>;
  subtle: {
    encrypt: jest.Mock<any, any>;
    decrypt: jest.Mock<any, any>;
    importKey: jest.Mock<any, any>;
  };
  applyTo: (window: any) => void;
  constructor(window: Window) {
    this.decryptOutput = 'decrypted_message';
    this.getRandomValues = jest.fn();
    this.subtle = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      importKey: jest.fn(),
    };
    let mockDecryptResponse = jest.fn();
    mockDecryptResponse.mockImplementation((fn) => fn(this.decryptOutput));

    this.subtle.decrypt.mockImplementation((settings, key, data) => {
      return {
        then: jest.fn().mockImplementation((func) => {
          func(Buffer.concat([settings.iv, data]));
          return { catch: jest.fn() };
        }),
      };
    });

    this.subtle.importKey.mockImplementation(
      (_format, _key, _algorithm, _extractable, _keyUsages) => {
        return {
          then: jest.fn().mockImplementation((func) => {
            func('key');
            return { catch: jest.fn() };
          }),
        };
      }
    );

    this.applyTo = (window) => {
      Object.defineProperty(window, 'crypto', { value: this, writable: true });
    };

    this.applyTo(window);
  }
}

export function setupFakeTime() {
  jest.useFakeTimers();
  jest.spyOn(global, 'setTimeout');
  jest.spyOn(global, 'clearTimeout');
  jest.setSystemTime(new Date('2021-10-01'));
}

export function resetFakeTime() {
  const mockSetTimeout = setTimeout as unknown as jest.Mock;
  const mockClearTimeout = clearTimeout as jest.Mock;
  mockSetTimeout.mockClear();
  mockClearTimeout.mockClear();
  jest.clearAllTimers();
  jest.setSystemTime(new Date('2021-10-01'));
}

export function setCookieMock(document: Document) {
  return new CookieMock(document);
}

export function setUid2Cookie(value: any) {
  document.cookie = UID2.COOKIE_NAME + '=' + encodeURIComponent(JSON.stringify(value));
}

export function removeUid2Cookie() {
  document.cookie = document.cookie + '=;expires=Tue, 1 Jan 1980 23:59:59 GMT';
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
    const payload = docCookie.split('; ').find((row) => row.startsWith(UID2.COOKIE_NAME + '='));
    if (payload) {
      return JSON.parse(decodeURIComponent(payload.split('=')[1]));
    }
  }
  return null;
}

export function removeUid2LocalStorage() {
  localStorage.removeItem(uid2LocalStorageKeyName);
}

export function setUid2LocalStorage(identity: any) {
  const value = JSON.stringify(identity);
  localStorage.setItem(uid2LocalStorageKeyName, value);
}

export function getUid2LocalStorage() {
  const value = localStorage.getItem(uid2LocalStorageKeyName);
  return value !== null ? JSON.parse(value) : null;
}

export function getEuid(useCookie?: boolean) {
  return useCookie ? getEuidCookie() : getEuidLocalStorage();
}

export function setEuid(value: any, useCookie?: boolean) {
  return useCookie ? setEuidCookie(value) : setEuidLocalStorage(value);
}

export function setEuidCookie(value: any) {
  document.cookie = '__euid' + '=' + encodeURIComponent(JSON.stringify(value));
}

export function getEuidCookie() {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie.split('; ').find((row) => row.startsWith('__euid' + '='));
    if (payload) {
      return JSON.parse(decodeURIComponent(payload.split('=')[1]));
    }
  }
}

export function removeEuidLocalStorage() {
  localStorage.removeItem(euidLocalStorageKeyName);
}

export function setEuidLocalStorage(identity: any) {
  const value = JSON.stringify(identity);
  localStorage.setItem(euidLocalStorageKeyName, value);
}

export function getEuidLocalStorage() {
  const value = localStorage.getItem(euidLocalStorageKeyName);
  return value !== null ? JSON.parse(value) : null;
}

export function makeIdentityV1(overrides?: any) {
  return {
    advertising_token: 'test_advertising_token',
    refresh_token: 'test_refresh_token',
    refresh_from: Date.now() + 100000,
    identity_expires: Date.now() + 200000,
    refresh_expires: Date.now() + 300000,
    ...(overrides || {}),
  };
}

export function makeIdentityV2(overrides = {}) {
  return {
    advertising_token: 'test_advertising_token',
    refresh_token: 'test_refresh_token',
    refresh_response_key: bytesToBase64(crypto.getRandomValues(new Uint8Array(32))),
    refresh_from: Date.now() + 100000,
    identity_expires: Date.now() + 200000,
    refresh_expires: Date.now() + 300000,
    ...(overrides || {}),
  };
}

export function makeUid2CstgOption(overrides?: any) {
  return {
    serverPublicKey:
      'UID2-X-L-24B8a/eLYBmRkXA9yPgRZt+ouKbXewG2OPs23+ov3JC8mtYJBCx6AxGwJ4MlwUcguebhdDp2CvzsCgS9ogwwGA==',
    subscriptionId: 'subscription-id',
    ...(overrides || {}),
  };
}

export function makeEuidCstgOption(overrides?: any) {
  return {
    serverPublicKey:
      'EUID-X-L-24B8a/eLYBmRkXA9yPgRZt+ouKbXewG2OPs23+ov3JC8mtYJBCx6AxGwJ4MlwUcguebhdDp2CvzsCgS9ogwwGA==',
    subscriptionId: 'subscription-id',
    ...(overrides || {}),
  };
}

export function resetCrypto(window: Window) {
  Object.defineProperty(window, 'crypto', {
    get() {
      return require('crypto');
    },
  });
}
