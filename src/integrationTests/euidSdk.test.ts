import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks';
import { sdkWindow, EUID, __euidInternalHandleScriptLoad, SdkOptions } from '../euidSdk';
import { EventType, CallbackHandler } from '../callbackManager';
import { __euidSSProviderScriptLoad } from '../secureSignalEuid';
import { UidSecureSignalProvider } from '../secureSignal_shared';

let callback: any;
let asyncCallback: jest.Mock<CallbackHandler>;
let euid: EUID;
let xhrMock: any;
let uid2ESP: UidSecureSignalProvider;
let secureSignalProvidersPushMock: jest.Mock<(p: any) => Promise<void>>;
let getAdvertisingTokenMock: jest.Mock<() => Promise<string>>;
getAdvertisingTokenMock = jest.fn<() => Promise<string>>();

const debugOutput = false;

mocks.setupFakeTime();
const mockDomain = 'www.uidapi.com';

const makeIdentity = mocks.makeIdentityV2;

const getConfigCookie = () => {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie
      .split('; ')
      .find((row) => row.startsWith(EUID.COOKIE_NAME + '_config' + '='));
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

describe('when a callback is provided', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.resetFakeTime();
    jest.runOnlyPendingTimers();

    callback = jest.fn();
    xhrMock = new mocks.XhrMock(sdkWindow);
    mocks.setCookieMock(sdkWindow.document);
    asyncCallback = jest.fn((event, payload) => {
      if (debugOutput) {
        console.log('Async Callback Event:', event);
        console.log('Payload:', payload);
      }
    });
    secureSignalProvidersPushMock = jest.fn(async (p) => await p.collectorFunction());
    window.googletag = {
      secureSignalProviders: {
        push: secureSignalProvidersPushMock,
      },
    };

    sdkWindow.__euid = new EUID();
  });

  afterEach(() => {
    mocks.resetFakeTime();
    sdkWindow.__euid = undefined;
  });

  const refreshFrom = Date.now() + 100;
  const identity = { ...makeIdentity(), refresh_from: refreshFrom };
  const refreshedIdentity = {
    ...makeIdentity(),
    advertising_token: 'refreshed_token',
  };
  describe('before constructor is called', () => {
    test('it should be called during the construction process', () => {
      sdkWindow.__euid = { callbacks: [asyncCallback] };
      const calls = asyncCallback.mock.calls.length;
      __euidInternalHandleScriptLoad();
      expect(asyncCallback).toBeCalledTimes(calls + 1);
      expect(asyncCallback).toBeCalledWith(EventType.SdkLoaded, expect.anything());
    });
    test('it should not be called by the constructor itself', () => {
      sdkWindow.__euid = { callbacks: [asyncCallback] };
      const calls = asyncCallback.mock.calls.length;
      new EUID([asyncCallback]);
      expect(asyncCallback).toBeCalledTimes(calls);
    });
  });
  describe('before construction but the window global has already been assigned', () => {
    // N.B. this is an artificial situation to check an edge case.
    test('it should be called during construction', () => {
      sdkWindow.__euid = new EUID();
      const calls = asyncCallback.mock.calls.length;
      new EUID([asyncCallback]);
      expect(asyncCallback).toBeCalledTimes(calls + 1);
    });
  });
  describe('after construction', () => {
    test('the SDKLoaded event is sent immediately', () => {
      sdkWindow.__euid = new EUID();
      const calls = asyncCallback.mock.calls.length;
      sdkWindow.__euid.callbacks!.push(asyncCallback);
      expect(asyncCallback).toBeCalledTimes(calls + 1);
      expect(asyncCallback).toBeCalledWith(EventType.SdkLoaded, expect.anything());
    });
  });

  describe('when getUid2AdvertisingToken exists and returns valid advertisingToken', () => {
    test('should send signal to Google ESP', async () => {
      window.getEuidAdvertisingToken = getAdvertisingTokenMock;
      getAdvertisingTokenMock.mockReturnValue(Promise.resolve('testToken'));
      uid2ESP = new UidSecureSignalProvider(false, true);
      expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
      expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'euid.eu',
        })
      );
      expect(await secureSignalProvidersPushMock.mock.results[0].value).toBe('testToken');
    });
  });

  describe('When SDK initialized after both SDK and SS script loaded - EUID', () => {
    test.only('should send identity to Google ESP', async () => {
      __euidInternalHandleScriptLoad();
      __euidSSProviderScriptLoad();
      (sdkWindow.__euid as EUID).init({ identity });

      expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
      await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'euid.eu',
        })
      );
      await mocks.flushPromises();
      expect(await secureSignalProvidersPushMock.mock.results[0].value).toBe(
        identity.advertising_token
      );
    });
  });
});

describe('Store config EUID', () => {
  const identity = makeIdentity();
  const options: SdkOptions = {
    baseUrl: 'http://test-host',
    cookieDomain: mockDomain,
    refreshRetryPeriod: 1000,
    useCookie: false,
  };

  beforeEach(() => {
    localStorage.removeItem('UID2-sdk-identity_config');
    document.cookie = EUID.COOKIE_NAME + '_config' + '=;expires=Tue, 1 Jan 1980 23:59:59 GMT';
  });

  describe('when useCookie is true', () => {
    test('should store config in cookie', () => {
      euid.init({ callback: callback, identity: identity, ...options, useCookie: true });
      const cookie = getConfigCookie();
      expect(cookie).toBeInstanceOf(Object);
      expect(cookie).toHaveProperty('cookieDomain');
      const storageConfig = getConfigStorage();
      expect(storageConfig).toBeNull();
    });
  });
  describe('when useCookie is false', () => {
    test('should store config in local storage', () => {
      euid.init({ callback: callback, identity: identity, ...options });
      const storageConfig = getConfigStorage();
      expect(storageConfig).toBeInstanceOf(Object);
      expect(storageConfig).toHaveProperty('cookieDomain');
      const cookie = getConfigCookie();
      expect(cookie).toBeNull();
    });
  });
});
