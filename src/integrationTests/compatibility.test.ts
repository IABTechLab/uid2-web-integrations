import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks';
import { sdkWindow, UID2 } from '../uid2Sdk';

let callback: any;
let uid2: UID2;
let xhrMock: any;

mocks.setupFakeTime();

beforeAll(() => {
  mocks.setWarnMock();
});

afterAll(() => {
  mocks.clearWarnMock();
});

beforeEach(() => {
  callback = jest.fn();
  uid2 = new UID2();
  xhrMock = new mocks.XhrMock(sdkWindow);
  mocks.setCookieMock(sdkWindow.document);
});

afterEach(() => {
  mocks.resetFakeTime();
});

const setUid2Cookie = mocks.setUid2Cookie;
const getUid2 = mocks.getUid2;
const makeIdentity = mocks.makeIdentityV2;

let useCookie: boolean | undefined = undefined;

const testCookieAndLocalStorage = (test: () => void, only = false) => {
  const describeFn = only ? describe.only : describe;
  describeFn('Using default: ', () => {
    beforeEach(() => {
      useCookie = undefined;
    });
    test();
  });
  describeFn('Using cookies ', () => {
    beforeEach(() => {
      useCookie = true;
    });
    test();
  });
  describeFn('Using local storage ', () => {
    beforeEach(() => {
      useCookie = false;
    });
    test();
  });
};

testCookieAndLocalStorage(() => {
  describe('when a v0 cookie is available', () => {
    const originalIdentity = {
      advertising_token: 'original_advertising_token',
      refresh_token: 'original_refresh_token',
    };
    const updatedIdentity = makeIdentity({
      advertising_token: 'updated_advertising_token',
    });

    beforeEach(() => {
      setUid2Cookie(originalIdentity);
      uid2.init({ callback: callback, useCookie: useCookie });
    });

    test('should initiate token refresh', () => {
      expect(xhrMock.send).toHaveBeenCalledTimes(1);
    });
    test('should not set refresh timer', () => {
      expect(setTimeout).not.toHaveBeenCalled();
      expect(clearTimeout).not.toHaveBeenCalled();
    });
    test('should be in initialising state', () => {
      (expect(uid2) as any).toBeInAvailableState();
    });

    describe('when token refresh succeeds', () => {
      beforeEach(() => {
        xhrMock.responseText = JSON.stringify({
          status: 'success',
          body: updatedIdentity,
        });
        xhrMock.onreadystatechange(new Event(''));
      });

      test('should invoke the callback', () => {
        expect(callback).toHaveBeenLastCalledWith(
          expect.objectContaining({
            advertising_token: updatedIdentity.advertising_token,
            status: UID2.IdentityStatus.REFRESHED,
          })
        );
      });
      test('should set value', () => {
        expect(getUid2(useCookie).advertising_token).toBe(updatedIdentity.advertising_token);
      });
      test('should set refresh timer', () => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test('should be in available state', () => {
        (expect(uid2) as any).toBeInAvailableState(updatedIdentity.advertising_token);
      });
    });

    describe('when token refresh returns an error status', () => {
      beforeEach(() => {
        xhrMock.responseText = JSON.stringify({
          status: 'error',
          body: updatedIdentity,
        });
        xhrMock.onreadystatechange(new Event(''));
      });

      test('should invoke the callback', () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: originalIdentity.advertising_token,
            advertising_token: originalIdentity.advertising_token,
            status: UID2.IdentityStatus.ESTABLISHED,
          })
        );
      });
      test('should set enriched value', () => {
        const value = getUid2(useCookie);
        expect(value.refresh_token).toBe(originalIdentity.refresh_token);
        expect(value.refresh_from).toBe(Date.now());
        expect(value.identity_expires).toBeGreaterThan(Date.now());
        expect(value.refresh_expires).toBeGreaterThan(Date.now());
        expect(value.identity_expires).toBeLessThan(value.refresh_expires);
      });
      test('should set refresh timer', () => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test('should be in available state', () => {
        (expect(uid2) as any).toBeInAvailableState(originalIdentity.advertising_token);
      });
    });
  });
});
