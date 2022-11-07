import { afterEach,beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks.js';
import { sdkWindow, UID2 } from '../uid2Sdk';

let callback: any;
let uid2: UID2;
let xhrMock: any;

mocks.setupFakeTime();

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
const getUid2Cookie = mocks.getUid2Cookie;
const makeIdentity = mocks.makeIdentityV2;

describe('when a v0 cookie is available', () => {
  const originalIdentity = {
    advertising_token: 'original_advertising_token',
    refresh_token: 'original_refresh_token',
  };
  const updatedIdentity = makeIdentity({
    advertising_token: 'updated_advertising_token'
  });

  beforeEach(() => {
      setUid2Cookie(originalIdentity);
      uid2.init({ callback: callback });
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
      xhrMock.responseText = JSON.stringify({ status: 'success', body: updatedIdentity });
      xhrMock.onreadystatechange(new Event(''));
    });

    test('should invoke the callback', () => {
      expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({
        advertising_token: updatedIdentity.advertising_token,
        status: UID2.IdentityStatus.REFRESHED,
      }));
    });
    test('should set cookie', () => {
      expect(getUid2Cookie().advertising_token).toBe(updatedIdentity.advertising_token);
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
      xhrMock.responseText = JSON.stringify({ status: 'error', body: updatedIdentity });
      xhrMock.onreadystatechange(new Event(''));
    });

    test('should invoke the callback', () => {
      expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        advertisingToken: originalIdentity.advertising_token,
        advertising_token: originalIdentity.advertising_token,
        status: UID2.IdentityStatus.ESTABLISHED,
      }));
    });
    test('should set enriched cookie', () => {
      expect(getUid2Cookie().refresh_token).toBe(originalIdentity.refresh_token);
      expect(getUid2Cookie().refresh_from).toBe(Date.now());
      expect(getUid2Cookie().identity_expires).toBeGreaterThan(Date.now());
      expect(getUid2Cookie().refresh_expires).toBeGreaterThan(Date.now());
      expect(getUid2Cookie().identity_expires).toBeLessThan(getUid2Cookie().refresh_expires);
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
