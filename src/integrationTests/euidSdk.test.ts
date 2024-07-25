import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks';
import { sdkWindow, EUID, __euidInternalHandleScriptLoad } from '../euidSdk';
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

const makeIdentity = mocks.makeIdentityV2;

describe('when a callback is provided', () => {
  beforeEach(() => {
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
    jest.clearAllMocks();
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

  // describe('When SDK initialized after both SDK and SS script loaded - EUID', () => {
  //   test('should send identity to Google ESP', async () => {
  //     __euidInternalHandleScriptLoad();
  //     __euidSSProviderScriptLoad();
  //     (sdkWindow.__euid as EUID).init({ identity });

  //     expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
  //     await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         id: 'euid.eu',
  //       })
  //     );
  //     await mocks.flushPromises();
  //     expect(await secureSignalProvidersPushMock.mock.results[0].value).toBe(
  //       identity.advertising_token
  //     );
  //   });
  // });
});
