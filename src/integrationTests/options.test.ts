import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks';
import { SdkOptions, sdkWindow, UID2 } from '../uid2Sdk';
import { loadConfig, removeConfig } from '../configManager';
import { ProductDetails } from '../product';

let callback: any;
let uid2: UID2;
let xhrMock: any;
let cookieMock: any;

mocks.setupFakeTime();

const mockDomain = 'www.uidapi.com';
const mockUrl = `http://${mockDomain}/test/index.html`;

beforeEach(() => {
  callback = jest.fn();
  uid2 = new UID2();
  xhrMock = new mocks.XhrMock(sdkWindow);
  jest.spyOn(document, 'URL', 'get').mockImplementation(() => mockUrl);
  cookieMock = new mocks.CookieMock(sdkWindow.document);
  removeUid2Cookie();
  removeUid2LocalStorage();
});

afterEach(() => {
  mocks.resetFakeTime();
});

const makeIdentity = mocks.makeIdentityV2;
const getUid2Cookie = mocks.getUid2Cookie;
const getUid2LocalStorage = mocks.getUid2LocalStorage;
const removeUid2Cookie = mocks.removeUid2Cookie;
const removeUid2LocalStorage = mocks.removeUid2LocalStorage;
const getUid2 = mocks.getUid2;

const getConfigCookie = () => {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie
      .split('; ')
      .find((row) => row.startsWith(UID2.COOKIE_NAME + '_config' + '='));
    if (payload) {
      return JSON.parse(decodeURIComponent(payload.split('=')[1]));
    }
  }
  return null;
};

const getConfigStorage = () => {
  const data = localStorage.getItem('UID2-sdk-identity_config');
  if (data) {
    const result = JSON.parse(data);
    return result;
  }
  return null;
};

describe('cookieDomain option', () => {
  describe('when using default value', () => {
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: makeIdentity(),
        useCookie: true,
      });
    });

    test('should not mention domain in the cookie string', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME);
      expect(cookie).not.toBe('');
      expect(cookie).not.toContain('Domain=');
    });
  });

  describe('when using custom value', () => {
    const domain = 'uidapi.com';

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: makeIdentity(),
        cookieDomain: domain,
        useCookie: true,
      });
    });

    test('should use domain in the cookie string', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME);
      expect(cookie).toContain(`Domain=${domain};`);
    });
  });
});

describe('cookiePath option', () => {
  describe('when using default value', () => {
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: makeIdentity(),
        useCookie: true,
      });
    });

    test('should use the default path in the cookie string', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME) as string;
      expect(cookie + ';').toContain('Path=/;');
    });
  });

  describe('when using custom value', () => {
    const path = '/test/';

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: makeIdentity(),
        cookiePath: path,
        useCookie: true,
      });
    });

    test('should use custom path in the cookie string', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME) as string;
      expect(cookie + ';').toContain(`Path=${path};`);
    });
  });
});

describe('baseUrl option', () => {
  const identity = makeIdentity({
    refresh_from: Date.now() - 100000,
  });

  describe('when using default value', () => {
    beforeEach(() => {
      uid2.init({ callback: callback, identity: identity });
    });

    test('should use prod URL when refreshing token', () => {
      expect(xhrMock.open.mock.calls.length).toBe(1);
      expect(xhrMock.open.mock.calls[0][1]).toContain('prod.uidapi.com');
    });
  });

  describe('when using custom value', () => {
    const baseUrl = 'http://test-host';

    beforeEach(() => {
      uid2.init({ callback: callback, identity: identity, baseUrl: baseUrl });
    });

    test('should use custom URL when refreshing token', () => {
      expect(xhrMock.open.mock.calls.length).toBe(1);
      expect(xhrMock.open.mock.calls[0][1]).not.toContain('prod.uidapi.com');
      expect(xhrMock.open.mock.calls[0][1]).toContain('test-host');
    });
  });
});

describe('refreshRetryPeriod option', () => {
  describe('when using default value', () => {
    beforeEach(() => {
      uid2.init({ callback: callback, identity: makeIdentity() });
    });

    test('it should use the default retry period', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toBeCalledWith(expect.any(Function), UID2.DEFAULT_REFRESH_RETRY_PERIOD_MS);
    });
  });

  describe('when using custom value', () => {
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: makeIdentity(),
        refreshRetryPeriod: 12345,
      });
    });

    test('it should use the default retry period', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toBeCalledWith(expect.any(Function), 12345);
    });
  });
});

describe('useCookie option', () => {
  const identity = makeIdentity();

  describe('when using default value', () => {
    beforeEach(() => {
      uid2.init({ callback: callback, identity: identity });
    });
    test('should set identity in local storage', () => {
      expect(getUid2LocalStorage().advertising_token).toBe(identity.advertising_token);
    });
  });
  describe('when useCookie is false', () => {
    beforeEach(() => {
      uid2.init({ callback: callback, identity: identity, useCookie: false });
    });
    test('should set identity in local storage only', () => {
      expect(getUid2LocalStorage().advertising_token).toBe(identity.advertising_token);
      expect(getUid2Cookie()).toBeNull();
    });
  });
  describe('when useCookie is true', () => {
    beforeEach(() => {
      uid2.init({ callback: callback, identity: identity, useCookie: true });
    });
    test('should set identity in cookie only', () => {
      expect(getUid2Cookie().advertising_token).toBe(identity.advertising_token);
      expect(getUid2LocalStorage()).toBeNull();
    });
  });
});

describe('multiple init calls', () => {
  const identity = makeIdentity();
  const baseUrl = 'http://test-host';
  const cookiePath = '/test/';
  const cookieDomain = 'uidapi.com';

  describe('when nothing has changed', () => {
    beforeEach(() => {
      uid2.init({
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
      });
      uid2.init({
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
      });
      uid2.init({
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
      });
    });
    test('should return next two init calls without changing anything', () => {
      expect(getUid2LocalStorage().advertising_token).toBe(identity.advertising_token);
      let storageConfig = getConfigStorage();
      expect(storageConfig).toBeInstanceOf(Object);
      expect(storageConfig).toHaveProperty('cookiePath', cookiePath);
    });
  });

  describe('new base URL is given', () => {
    const oldBaseUrl = baseUrl;
    const newBaseUrl = 'http://example';

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: oldBaseUrl,
        useCookie: true,
      });
      uid2.init({
        baseUrl: newBaseUrl,
      });
    });
    test('should use new base url', () => {
      const configCookie = getConfigCookie();
      expect(configCookie).toHaveProperty('baseUrl', newBaseUrl);
    });
  });

  describe('no base URL is given, should use new base URL', () => {
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        useCookie: true,
      });
      uid2.init({
        cookiePath: '/',
      });
    });

    test('should use old base url', () => {
      const configCookie = getConfigCookie();
      expect(configCookie).toHaveProperty('baseUrl', baseUrl);
    });
  });

  describe('new identity provided but expired', () => {
    const newIdentity = makeIdentity({
      advertising_token: 'new_test_advertising_token',
      identity_expires: Date.now() - 100000,
    });
    const useCookie = true;

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        useCookie: useCookie,
      });
      uid2.init({
        identity: newIdentity,
      });
    });
    test('should set value to old identity', () => {
      expect(getUid2(useCookie).advertising_token).toBe(identity.advertising_token);
    });
    test('old identity should be in available state', () => {
      (expect(uid2) as any).toBeInAvailableState(identity.advertising_token);
    });
  });

  describe('new identity provided but expires before old identity', () => {
    const oldIdentity = makeIdentity({ identity_expires: Date.now() + 10000 });
    const newIdentity = makeIdentity({
      advertising_token: 'new_test_advertising_token',
      identity_expires: Date.now() + 5000,
    });
    const useCookie = true;

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: oldIdentity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        useCookie: useCookie,
      });
      uid2.init({
        identity: newIdentity,
      });
    });

    test('should set value', () => {
      expect(getUid2(useCookie).advertising_token).toBe(oldIdentity.advertising_token);
    });
    test('should be in available state', () => {
      (expect(uid2) as any).toBeInAvailableState(oldIdentity.advertising_token);
    });
  });

  describe('new identity provided and expires after old identity', () => {
    const newIdentity = makeIdentity({
      advertising_token: 'new_test_advertising_token',
      identity_expires: Date.now() + 300000,
    });
    const useCookie = true;

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        useCookie: useCookie,
      });
      uid2.init({
        identity: newIdentity,
      });
    });

    test('should set value', () => {
      expect(getUid2(useCookie).advertising_token).toBe(newIdentity.advertising_token);
    });
    test('should be in available state', () => {
      (expect(uid2) as any).toBeInAvailableState(newIdentity.advertising_token);
    });
  });

  describe('new identity provided and use cookie is false', () => {
    const newIdentity = makeIdentity({
      advertising_token: 'new_test_advertising_token',
      identity_expires: Date.now() + 300000,
    });
    const useCookie = false;

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        useCookie: useCookie,
      });
      uid2.init({
        identity: newIdentity,
      });
    });

    test('should set value', () => {
      expect(getUid2(useCookie).advertising_token).toBe(newIdentity.advertising_token);
    });
    test('should be in available state', () => {
      (expect(uid2) as any).toBeInAvailableState(newIdentity.advertising_token);
    });
  });

  describe('new cookie path', () => {
    const newCookiePath = '/';

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookieDomain: cookieDomain,
        cookiePath: cookiePath,
        useCookie: true,
      });
      uid2.init({
        cookiePath: newCookiePath,
      });
    });

    test('should update cookie manager', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME);
      expect(cookie).toContain(`Domain=${cookieDomain};`);
      expect(cookie + ';').toContain(`Path=${newCookiePath};`);
      const configCookie = getConfigCookie();
      expect(configCookie).toHaveProperty('cookieDomain', cookieDomain);
      expect(configCookie).toHaveProperty('cookiePath', newCookiePath);
    });
  });

  describe('new refreshretry period', () => {
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        refreshRetryPeriod: 12345,
      });
      uid2.init({
        refreshRetryPeriod: 67890,
      });
    });
    test('should use the new refresh retry period', () => {
      expect(setTimeout).toBeCalledWith(expect.any(Function), 67890);
    });
  });

  describe('usecookie changing from true to false', () => {
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        refreshRetryPeriod: 12345,
        useCookie: true,
      });
      uid2.init({
        useCookie: false,
      });
    });
    test('should change config from cookie to local storage', () => {
      const storageConfig = getConfigStorage();
      expect(storageConfig).toBeInstanceOf(Object);
      expect(storageConfig).toHaveProperty('cookiePath');
      const configCookie = getConfigCookie();
      expect(configCookie).toBeNull();
      expect(getUid2LocalStorage().advertising_token).toBe(identity.advertising_token);
      expect(getUid2Cookie()).toBeNull();
    });
  });

  describe('usecookie changing from false to true', () => {
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        refreshRetryPeriod: 12345,
        useCookie: false,
      });
      uid2.init({
        useCookie: true,
        cookiePath: cookiePath,
      });
    });
    test('should change config from cookie to local storage', () => {
      const storageConfig = getConfigStorage();
      expect(storageConfig).toBeNull();
      const configCookie = getConfigCookie();
      expect(configCookie).toBeInstanceOf(Object);
      expect(configCookie).toHaveProperty('cookiePath');
      expect(getUid2Cookie().advertising_token).toBe(identity.advertising_token);
      expect(getUid2LocalStorage()).toBeNull();
    });
  });

  describe('setting a new identity and make sure callback is called', () => {
    const newIdentity = makeIdentity({
      advertising_token: 'new_advertising_token',
      identity_expires: Date.now() + 300000,
    });
    beforeEach(() => {
      uid2.init({
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        refreshRetryPeriod: 12345,
        useCookie: true,
        callback: callback,
      });
      uid2.init({
        useCookie: false,
        identity: newIdentity,
      });
    });
    test('should contain one init callback', () => {
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('adding multiple callbacks and then setting new identity', () => {
    const newIdentity = makeIdentity({
      advertising_token: 'new_advertising_token',
      identity_expires: Date.now() + 300000,
    });
    const callback2 = jest.fn(() => {
      return 'testing one';
    });
    const callback3 = jest.fn(() => {
      return 'testing two';
    });

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        refreshRetryPeriod: 12345,
        useCookie: false,
      });
      uid2.init({
        callback: callback2,
      });
      uid2.init({
        callback: callback3,
      });
      uid2.init({
        identity: newIdentity,
      });
    });
    test('should contain only one init callback function', () => {
      expect(callback).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });
  });
});

describe('Store config UID2', () => {
  const identity = makeIdentity();
  const options: SdkOptions = {
    baseUrl: 'http://test-host',
    cookieDomain: mockDomain,
    cookiePath: '/',
    refreshRetryPeriod: 1000,
    useCookie: false,
  };
  const productDetails: ProductDetails = {
    cookieName: '__uid2',
    defaultBaseUrl: 'http://test-host',
    localStorageKey: 'UID2-sdk-identity',
    name: 'UID2',
  };
  const previousOptions: SdkOptions = options;

  beforeEach(() => {
    localStorage.removeItem('UID2-sdk-identity_config');
    document.cookie =
      UID2.COOKIE_NAME + '_config' + '=;expires=Tue, 1 Jan 1980 23:59:59 GMT;path=/';
  });

  describe('when useCookie is true', () => {
    test('should store config in cookie', () => {
      uid2.init({ callback: callback, identity: identity, ...options, useCookie: true });
      const cookie = getConfigCookie();
      expect(cookie).toBeInstanceOf(Object);
      expect(cookie).toHaveProperty('cookieDomain');
      const storageConfig = loadConfig(options, productDetails);
      expect(storageConfig).toBeNull();
    });
  });
  describe('when useCookie is false', () => {
    test('should store config in local storage', () => {
      uid2.init({ callback: callback, identity: identity, ...options });
      const storageConfig = loadConfig(options, productDetails);
      expect(storageConfig).toBeInstanceOf(Object);
      expect(storageConfig).toHaveProperty('cookieDomain');
      const cookie = getConfigCookie();
      expect(cookie).toBeNull();
    });
  });
  describe('when useCookie is false', () => {
    test('can successfully clear the config in storage', () => {
      uid2.init({ callback: callback, identity: identity, ...options });
      let storageConfig = loadConfig(options, productDetails);
      expect(storageConfig).toBeInstanceOf(Object);
      expect(storageConfig).toHaveProperty('cookieDomain');
      removeConfig(previousOptions, productDetails);
      storageConfig = loadConfig(options, productDetails);
      expect(storageConfig).toBeNull();
    });
  });
});
