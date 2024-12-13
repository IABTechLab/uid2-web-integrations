import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks';
import { sdkWindow, EUID, __euidInternalHandleScriptLoad, SdkOptions } from '../euidSdk';
import { EventType, CallbackHandler } from '../callbackManager';
import { __euidSSProviderScriptLoad } from '../secureSignalEuid';
import { UidSecureSignalProvider } from '../secureSignal_shared';
import { ProductDetails } from '../product';
import { removeConfig } from '../configManager';

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
const mockUrl = `http://${mockDomain}/test/index.html`;
jest.spyOn(document, 'URL', 'get').mockImplementation(() => mockUrl);

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
    test('should send identity to Google ESP', async () => {
      __euidInternalHandleScriptLoad();
      __euidSSProviderScriptLoad();
      (sdkWindow.__euid as EUID).init({ identity });

      await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'euid.eu',
        })
      );
      await mocks.flushPromises();
      expect(await secureSignalProvidersPushMock.mock.results[0].value).toBe('testToken');
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

  const productDetails: ProductDetails = {
    cookieName: '__euid',
    defaultBaseUrl: 'http://test-host',
    localStorageKey: 'EUID-sdk-identity',
    name: 'EUID',
  };

  beforeEach(() => {
    sdkWindow.__euid = new EUID();
    document.cookie =
      productDetails.cookieName + '_config' + '=;expires=Tue, 1 Jan 1980 23:59:59 GMT;path=/';
  });

  afterEach(() => {
    sdkWindow.__euid = undefined;
  });

  describe('when useCookie is true', () => {
    test('should store config in cookie', () => {
      (sdkWindow.__euid as EUID).init({
        callback: callback,
        identity: identity,
        ...options,
        useCookie: true,
      });
      const cookie = getConfigCookie();
      expect(cookie).toBeInstanceOf(Object);
      expect(cookie).toHaveProperty('cookieDomain');
    });
  });
  describe('when useCookie is true', () => {
    test('can successfully clear the config cookie', () => {
      (sdkWindow.__euid as EUID).init({
        callback: callback,
        identity: identity,
        ...options,
        useCookie: true,
      });
      let cookie = getConfigCookie();
      expect(cookie).toBeInstanceOf(Object);
      removeConfig({ ...options, useCookie: true }, productDetails);
      cookie = getConfigCookie();
      expect(cookie).toBeNull();
    });
  });
});
