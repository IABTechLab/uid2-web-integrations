import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks';
import { sdkWindow, UID2 } from '../../uid2/uid2Sdk';

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
