import * as jsdom from 'jsdom';
import { Cookie } from 'tough-cookie';
import { UID2 } from './uid2Sdk';
import { Uid2Identity } from './Uid2Identity';

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
      return this.jar.getSetCookieStringsSync(this.url).filter(c => c.startsWith(name+'='))[0];
    };
    this.applyTo = (document: Document) => {
      jest.spyOn(document, 'cookie', 'get').mockImplementation(() => this.get());
      jest.spyOn(document, 'cookie', 'set').mockImplementation((value) => this.set(value));
    };

    this.applyTo(document);
  }
}

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

  sendRefreshApiResponse(identity: Uid2Identity) {
    this.responseText = btoa(JSON.stringify({ status: 'success', body: identity }));
    this.onreadystatechange(new Event(''));
  }  

  constructor(window: Window) {
    this.open             = jest.fn();
    this.send             = jest.fn();
    this.abort            = jest.fn();
    this.overrideMimeType = jest.fn();
    this.setRequestHeader = jest.fn();
    this.status = 200;
    this.responseText = btoa("response_text")
    this.readyState       = this.DONE;
    this.applyTo = (window) => {
      jest.spyOn(window, 'XMLHttpRequest').mockImplementation(() => this);
    };

    this.applyTo(window);
  }
}

export class CryptoMock {
  decryptOutput: string;
  getRandomValues: jest.Mock<any, any>;
  subtle: { encrypt: jest.Mock<any, any>; decrypt: jest.Mock<any, any>; importKey: jest.Mock<any, any>; };
  applyTo: (window: any) => void;
  constructor(window: Window) {
    this.decryptOutput = "decrypted_message";
    this.getRandomValues = jest.fn();
    this.subtle = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      importKey: jest.fn(),
    };
    let mockDecryptResponse = jest.fn();
    mockDecryptResponse.mockImplementation((fn) => fn(this.decryptOutput))

    this.subtle.decrypt.mockImplementation((settings, key, data) => {
      return { then: jest.fn().mockImplementation((func) => {
        func(Buffer.concat([settings.iv, data]));
        return { catch: jest.fn() }
      }) }
    });

    this.subtle.importKey.mockImplementation((_format, _key, _algorithm, _extractable, _keyUsages) => {
      return { then: jest.fn().mockImplementation((func) => {
        func("key");
        return { catch: jest.fn() }
      }) }
    });

    this.applyTo = (window) => {
      Object.defineProperty(window, 'crypto', { value: this });
    }

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

export async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

export function getUid2Cookie() {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie.split('; ').find(row => row.startsWith(UID2.COOKIE_NAME+'='));
    if (payload) {
      return JSON.parse(decodeURIComponent(payload.split('=')[1]));
    }
  }
}

export function setEuidCookie(value: any) {
  document.cookie = "__euid" + '=' + encodeURIComponent(JSON.stringify(value));
}

export function getEuidCookie() {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie.split('; ').find(row => row.startsWith("__euid"+'='));
    if (payload) {
      return JSON.parse(decodeURIComponent(payload.split('=')[1]));
    }
  }
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
    refresh_response_key: btoa('test_refresh_response_key'),
    refresh_from: Date.now() + 100000,
    identity_expires: Date.now() + 200000,
    refresh_expires: Date.now() + 300000,
    ...(overrides || {}),
  };
}
