import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks';
import { sdkWindow, EUID, __euidInternalHandleScriptLoad } from '../euidSdk';
import { EventType, Uid2CallbackHandler } from '../uid2CallbackManager';

let callback: any;
let asyncCallback: jest.Mock<Uid2CallbackHandler>;
let euid: EUID;
let xhrMock: any;

const debugOutput = false;

mocks.setupFakeTime();

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
});

afterEach(() => {
  mocks.resetFakeTime();
});

const makeIdentity = mocks.makeIdentityV2;

describe('when a callback is provided', () => {
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
});
