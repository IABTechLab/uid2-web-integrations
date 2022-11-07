import { afterEach,beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks.js';
import { __uid2InternalHandleScriptLoad,sdkWindow, UID2 } from '../uid2Sdk';
import { EventType } from '../uid2CallbackManager';

let callback: any;
let uid2: UID2;
let xhrMock: any;
let _cryptoMock: any;
mocks.setupFakeTime();

beforeEach(() => {
  callback = jest.fn();
  uid2 = new UID2();
  xhrMock = new mocks.XhrMock(window);
  _cryptoMock = new mocks.CryptoMock(window);
  mocks.setCookieMock(window.document);
});

afterEach(() => {
  mocks.resetFakeTime();
});

const makeIdentity = mocks.makeIdentityV2;

describe('when getAdvertisingTokenAsync is called before init', () => {
  describe('when initialising with a valid identity', () => {
    const identity = makeIdentity();
    test('it should resolve promise after invoking the callback', () => {
      const p = uid2.getAdvertisingTokenAsync().then((token: any) => {
        expect(callback).toHaveBeenCalled();
        return token;
      });
      uid2.init({ callback: callback, identity: identity });
      jest.runAllTimers();
      return expect(p).resolves.toBe(identity.advertising_token);
    });
  });

  describe('when initialising with an invalid identity', () => {
    test('it should reject promise after invoking the callback', () => {
      const p = uid2.getAdvertisingTokenAsync().catch((e: any) => {
        expect(callback).toHaveBeenCalled();
        throw e;
      });
      uid2.init({ callback: callback });
      return expect(p).rejects.toBeInstanceOf(Error);
    });
  });

  describe('when auto refresh fails, but identity still valid', () => {
    test('it should reject promise after invoking the callback', () => {
      const originalIdentity = makeIdentity({
        refresh_from: Date.now() - 100000,
      });
      const p = uid2.getAdvertisingTokenAsync().then((token: any) => {
        expect(callback).toHaveBeenCalled();
        return token;
      });
      uid2.init({ callback: callback, identity: originalIdentity });
      xhrMock.responseText = JSON.stringify({ status: 'error' });
      xhrMock.onreadystatechange(new Event(''));
      return expect(p).resolves.toBe(originalIdentity.advertising_token);
    });
  });

  describe('when auto refresh fails, but identity already expired', () => {
    test('it should reject promise after invoking the callback', () => {
      const originalIdentity = makeIdentity({
        refresh_from: Date.now() - 100000,
        identity_expires: Date.now() - 1
      });
      const p = uid2.getAdvertisingTokenAsync().catch((e: any) => {
        expect(callback).toHaveBeenCalled();
        throw e;
      });
      uid2.init({ callback: callback, identity: originalIdentity });
      xhrMock.responseText = JSON.stringify({ status: 'error' });
      xhrMock.onreadystatechange(new Event(''));
      return expect(p).rejects.toBeInstanceOf(Error);
    });
  });

  describe('when giving multiple promises', () => {
    const identity = makeIdentity();
    test('it should resolve all promises', () => {
      const p1 = uid2.getAdvertisingTokenAsync();
      const p2 = uid2.getAdvertisingTokenAsync();
      const p3 = uid2.getAdvertisingTokenAsync();
      uid2.init({ callback: callback, identity: identity });
      return expect(Promise.all([p1, p2, p3])).resolves.toStrictEqual(Array(3).fill(identity.advertising_token));
    });
  });
});

describe('when getAdvertisingTokenAsync is called after init completed', () => {
  describe('when initialised with a valid identity', () => {
    const identity = makeIdentity();
    test('it should resolve promise', () => {
      uid2.init({ callback: callback, identity: identity });
      return expect(uid2.getAdvertisingTokenAsync()).resolves.toBe(identity.advertising_token);
    });
  });

  describe('when initialisation failed', () => {
    test('it should reject promise', () => {
      uid2.init({ callback: callback });
      return expect(uid2.getAdvertisingTokenAsync()).rejects.toBeInstanceOf(Error);
    });
  });

  describe('when identity is temporarily not available', () => {
    test('it should reject promise', () => {
      const originalIdentity = makeIdentity({
        refresh_from: Date.now() - 100000,
        identity_expires: Date.now() - 1
      });
      uid2.init({ callback: callback, identity: originalIdentity });
      xhrMock.responseText = JSON.stringify({ status: 'error' });
      xhrMock.onreadystatechange(new Event(''));
      return expect(uid2.getAdvertisingTokenAsync()).rejects.toBeInstanceOf(Error);
    });
  });

  describe('when disconnect() has been called', () => {
    test('it should reject promise', () => {
      uid2.init({ callback: callback, identity: makeIdentity() });
      uid2.disconnect();
      return expect(uid2.getAdvertisingTokenAsync()).rejects.toBeInstanceOf(Error);
    });
  });
});

describe('when getAdvertisingTokenAsync is called before refresh on init completes', () => {
  const originalIdentity = makeIdentity({
    refresh_from: Date.now() - 100000,
  });
  beforeEach(() => {
    uid2.init({ callback: callback, identity: originalIdentity });
  });

  describe('when promise obtained after disconnect', () => {
    test('it should reject promise', () => {
      uid2.disconnect();
      return expect(uid2.getAdvertisingTokenAsync()).rejects.toBeInstanceOf(Error);
    });
  });
});

describe('when window.__uid2.init is called on SdkLoaded from a callback', () => {
  const identity = makeIdentity();
  // Reset window UID2 instance
  const callback = jest.fn((eventType: EventType) => {
    if (eventType === UID2.EventType.SdkLoaded) {
      console.log('Trying');
      try {
        (sdkWindow.__uid2 as UID2).init({ identity });
      } catch (ex) {
        console.log(ex);
        throw ex;
      }
      console.log('Succeeded');
    }
  });
  test('the SDK should be initialized correctly', () => {
    sdkWindow.__uid2 = { callbacks: [] };
    sdkWindow.__uid2.callbacks!.push(callback);
    expect(callback).toHaveBeenCalledTimes(0);
    __uid2InternalHandleScriptLoad();
    jest.runOnlyPendingTimers();
    if (!(sdkWindow.__uid2 instanceof UID2)) throw Error('UID2 should be ready to use by the time SdkLoaded is triggered.');
    expect(callback).toHaveBeenNthCalledWith(1, UID2.EventType.SdkLoaded, expect.anything());
    console.log(identity.advertising_token);
    expect(sdkWindow.__uid2.getAdvertisingToken()).toBe(identity.advertising_token);
  });
});
