import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks';
import { EventType, SdkOptions, sdkWindow, UID2 } from '../uid2Sdk';
import { loadConfig, removeConfig } from '../configManager';
import { ProductDetails } from '../product';

let callback: any;
let uid2: UID2;
let xhrMock: any;
let cookieMock: any;

mocks.setupFakeTime();

const mockDomain = 'www.uidapi.com';
const mockUrl = `http://${mockDomain}/test/index.html`;

const uid2ProductDetails: ProductDetails = {
  name: 'UID2',
  defaultBaseUrl: 'https://prod.uidapi.com',
  localStorageKey: 'UID2-sdk-identity',
  cookieName: '__uid_2',
};

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
      .find((row) => row.startsWith(uid2ProductDetails.cookieName + '_config' + '='));
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
      const cookie = cookieMock.getSetCookieString(uid2ProductDetails.cookieName);
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
      const cookie = cookieMock.getSetCookieString(uid2ProductDetails.cookieName);
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
      const cookie = cookieMock.getSetCookieString(uid2ProductDetails.cookieName) as string;
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
      const cookie = cookieMock.getSetCookieString(uid2ProductDetails.cookieName) as string;
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

  describe('no base URL is given on second init call', () => {
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

  const identityTestCases = [
    {
      oldIdentity: identity,
      newIdentity: makeIdentity({
        advertising_token: 'new_test_advertising_token',
        identity_expires: Date.now() - 100000,
      }),
      expectedIdentity: identity,
      useCookie: true,
      description: 'new identity provided but expired',
    },
    {
      oldIdentity: makeIdentity({ identity_expires: Date.now() + 10000 }),
      newIdentity: makeIdentity({
        advertising_token: 'new_test_advertising_token',
        identity_expires: Date.now() + 5000,
      }),
      expectedIdentity: makeIdentity({ identity_expires: Date.now() + 10000 }),
      useCookie: true,
      description: 'new identity provided but expires before old identity',
    },
    {
      oldIdentity: identity,
      newIdentity: makeIdentity({
        advertising_token: 'new_test_advertising_token',
        identity_expires: Date.now() + 300000,
      }),
      expectedIdentity: makeIdentity({
        advertising_token: 'new_test_advertising_token',
        identity_expires: Date.now() + 300000,
      }),
      useCookie: true,
      description: 'new identity provided and expires after old identity',
    },
    {
      oldIdentity: identity,
      newIdentity: makeIdentity({
        advertising_token: 'new_test_advertising_token',
        identity_expires: Date.now() + 300000,
      }),
      expectedIdentity: makeIdentity({
        advertising_token: 'new_test_advertising_token',
        identity_expires: Date.now() + 300000,
      }),
      useCookie: false,
      description: 'new identity provided with useCookie is false',
    },
  ];

  describe('testing how identity changes with multiple init calls', () => {
    test.each(identityTestCases)(
      '$description',
      ({ oldIdentity, newIdentity, expectedIdentity, useCookie }) => {
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
        (expect(uid2) as any).toBeInAvailableState(expectedIdentity.advertising_token);
      }
    );
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
      const cookie = cookieMock.getSetCookieString(uid2ProductDetails.cookieName);
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

  describe('make sure when identity and callback are sent together, that callback is called with identity', () => {
    beforeEach(() => {
      uid2.init({
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        refreshRetryPeriod: 12345,
        useCookie: true,
        callback: callback,
      });
    });
    test('should contain one init callback', () => {
      expect(callback).toHaveBeenLastCalledWith(
        expect.objectContaining({
          advertising_token: identity.advertising_token,
        })
      );
    });
  });

  describe('adding multiple callbacks and then setting new identity', () => {
    const newIdentity = makeIdentity({
      advertising_token: 'new_advertising_token',
      identity_expires: Date.now() + 300000,
    });
    const callback2 = jest.fn(() => {
      return 'testing two';
    });
    const callback3 = jest.fn(() => {
      return 'testing three';
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
      expect(callback).toHaveBeenLastCalledWith(
        expect.objectContaining({
          advertising_token: newIdentity.advertising_token,
        })
      );
      expect(callback2).toHaveBeenLastCalledWith(
        expect.objectContaining({
          advertising_token: newIdentity.advertising_token,
        })
      );
      expect(callback3).toHaveBeenLastCalledWith(
        expect.objectContaining({
          advertising_token: newIdentity.advertising_token,
        })
      );
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

  const previousOptions: SdkOptions = options;

  beforeEach(() => {
    localStorage.removeItem('UID2-sdk-identity_config');
    document.cookie =
      uid2ProductDetails.cookieName + '_config' + '=;expires=Tue, 1 Jan 1980 23:59:59 GMT;path=/';
  });

  describe('when useCookie is true', () => {
    test('should store config in cookie', () => {
      uid2.init({ callback: callback, identity: identity, ...options, useCookie: true });
      const cookie = getConfigCookie();
      expect(cookie).toBeInstanceOf(Object);
      expect(cookie).toHaveProperty('cookieDomain');
      const storageConfig = getConfigStorage();
      expect(storageConfig).toBeNull();
    });
  });
  describe('when useCookie is false', () => {
    test('should store config in local storage', () => {
      uid2.init({ callback: callback, identity: identity, ...options });
      const storageConfig = getConfigStorage();
      expect(storageConfig).toBeInstanceOf(Object);
      expect(storageConfig).toHaveProperty('cookieDomain');
      const cookie = getConfigCookie();
      expect(cookie).toBeNull();
    });
  });
  describe('when useCookie is false', () => {
    test('can successfully clear the config in storage', () => {
      uid2.init({ callback: callback, identity: identity, ...options });
      let storageConfig = loadConfig(uid2ProductDetails);
      expect(storageConfig).toBeInstanceOf(Object);
      expect(storageConfig).toHaveProperty('cookieDomain');
      removeConfig(previousOptions, uid2ProductDetails);
      storageConfig = loadConfig(uid2ProductDetails);
      expect(storageConfig).toBeNull();
    });
  });
});

describe('calls the NoIdentityAvailable event', () => {
  let handler: ReturnType<typeof jest.fn>;
  beforeEach(() => {
    handler = jest.fn();
    uid2.callbacks.push(handler);
  });

  test('when init is called for the first time with no identity', () => {
    uid2.init({});
    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, { identity: null });
  });
  test('when init is already complete and called again with no identity', () => {
    uid2.init({});
    uid2.init({});
    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, { identity: null });
  });
  test('when init is already complete and called again with an expired identity', () => {
    uid2.init({});
    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, { identity: null });
    let expiredIdentity = makeIdentity({
      identity_expires: Date.now() - 100000,
      refresh_expires: Date.now() - 100000,
    });
    uid2.init({
      identity: expiredIdentity,
    });
    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: expiredIdentity,
    });
  });
  test('when init is already complete but the existing identity is expired', () => {
    let expiredIdentity = makeIdentity({
      identity_expires: Date.now() - 100000,
      refresh_expires: Date.now() - 100000,
    });
    uid2.init({
      identity: expiredIdentity,
    });
    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });
    uid2.init({});
    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: expiredIdentity,
    });
  });
  test('when identity is expired but refreshable', () => {
    let expiredRefreshableIdentity = makeIdentity({
      identity_expires: Date.now() - 10000,
      refresh_expires: Date.now() + 10000,
    });
    uid2.init({ identity: expiredRefreshableIdentity });

    // in this case, identity is temporarily unavailable but still unavailable
    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });
  });
  test('when login is required', () => {
    uid2.isLoginRequired();

    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });
  });
  test('when get identity returns null or get advertising token returns undefined', () => {
    const nullIdentity = uid2.getIdentity();

    expect(nullIdentity).toBeNull();
    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });
  });
  test('when there is no advertising token', () => {
    const token = uid2.getAdvertisingToken();

    expect(token).toBeUndefined();
    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });
  });
  test('when cstg does not succeed', () => {
    uid2.init({});
    expect(uid2.setIdentityFromEmail('a', mocks.makeUid2CstgOption())).rejects.toThrow(
      'Invalid email address'
    );

    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });
  });
  test('when an identity was valid but has since expired', () => {
    uid2.init({});
    expect(uid2.setIdentityFromEmail('a', mocks.makeUid2CstgOption())).rejects.toThrow(
      'Invalid email address'
    );

    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });
  });
  test('when identity was valid on init but has since expired', () => {
    const refreshFrom = Date.now() + 100;
    const originalIdentity = makeIdentity({
      advertising_token: 'original_advertising_token',
      identity_expires: refreshFrom,
      //refresh_from: refreshFrom,
    });

    uid2.init({ identity: originalIdentity });
    expect(handler).not.toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, { identity: null });

    // set time to an expired date for this identity
    jest.setSystemTime(originalIdentity.refresh_expires * 1000 + 1);

    uid2.isIdentityAvailable();

    expect(handler).toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: originalIdentity,
    });
  });
});

describe('does not call NoIdentityAvailable event', () => {
  let handler: ReturnType<typeof jest.fn>;
  beforeEach(() => {
    handler = jest.fn();
    uid2.callbacks.push(handler);
  });

  test('when setIdentity is run with a valid identity, should not call NoIdentityAvailable on set or get', () => {
    uid2.init({});
    handler = jest.fn();
    let validIdentity = makeIdentity();
    uid2.setIdentity(validIdentity);
    expect(handler).not.toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });

    uid2.getIdentity();
    expect(handler).not.toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });

    uid2.getAdvertisingToken();
    expect(handler).not.toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });
  });
  test('when identity is set with opted out identity', () => {
    uid2.init({});
    let optedOutIdentity = makeIdentity({ status: 'optout' });
    uid2.setIdentity(optedOutIdentity);
    expect(handler).not.toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });
  });
  test('when cstg is successful', async () => {
    uid2.init({});
    handler = jest.fn();
    expect(async () => {
      await uid2.setIdentityFromEmail('test@test.com', mocks.makeUid2CstgOption());
    }).not.toThrow();

    expect(handler).not.toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });
  });
  test('when identity is set with local storage', () => {
    let validIdentity = makeIdentity();
    mocks.setUid2LocalStorage(validIdentity);
    uid2.init({});

    expect(handler).not.toHaveBeenLastCalledWith(EventType.NoIdentityAvailable, {
      identity: null,
    });
  });
});
