
import { afterEach,beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks';
import { sdkWindow, UID2 } from '../uid2Sdk';

let callback: any;
let uid2: UID2;
let xhrMock: any;
let _cryptoMock;
let freshTokenPromise: Promise<string | undefined>;

mocks.setupFakeTime();

beforeEach(() => {
  callback = jest.fn();
  uid2 = new UID2();
  xhrMock = new mocks.XhrMock(sdkWindow);
  _cryptoMock = new mocks.CryptoMock(sdkWindow);
  mocks.setCookieMock(sdkWindow.document);
});

afterEach(() => {
  mocks.resetFakeTime();
});

const getUid2Cookie = mocks.getUid2Cookie;
const makeIdentity = mocks.makeIdentityV2;

describe('when auto refreshing a non-expired identity which does not require a refresh', () => {
  const originalIdentity = makeIdentity({
    advertising_token: 'original_advertising_token',
  });
  beforeEach(() => {
    uid2.init({ callback: callback, identity: originalIdentity });
    freshTokenPromise = uid2.getFreshAdvertisingToken();
    jest.clearAllMocks();
    jest.runOnlyPendingTimers();
  });

  test('should not invoke the callback', () => {
    expect(sdkWindow.crypto).toBeDefined();
    expect(callback).not.toHaveBeenCalled();
  });
  test('should not initiate token refresh', () => {
    expect(xhrMock.send).not.toHaveBeenCalled();
  });
  test('should set refresh timer', () => {
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(clearTimeout).not.toHaveBeenCalled();
  });
  test('should be in available state', () => {
    (expect(uid2) as any).toBeInAvailableState();
  });

  test('getFreshAdvertisingToken should return current adverstising token', async() => {
    expect(await freshTokenPromise).toEqual(originalIdentity.advertising_token)
  })
});

describe('when auto refreshing a non-expired identity which requires a refresh', () => {
  const refreshFrom = Date.now() + 100;
  const originalIdentity = makeIdentity({
    advertising_token: 'original_advertising_token',
    refresh_from: refreshFrom
  });
  const updatedIdentity = makeIdentity({
    advertising_token: 'updated_advertising_token'
  });

  beforeEach(() => {
    uid2.init({ callback: callback, identity: originalIdentity });
    jest.clearAllMocks();
    jest.setSystemTime(refreshFrom);
    jest.runOnlyPendingTimers();
  });

  test('should not invoke the callback', () => {
    expect(callback).not.toHaveBeenCalled();
  });
  test('should initiate token refresh', () => {
    expect(xhrMock.send).toHaveBeenCalledTimes(1);
  });
  test('should not set refresh timer', () => {
    expect(setTimeout).not.toHaveBeenCalled();
    expect(clearTimeout).not.toHaveBeenCalled();
  });
  test('should be in available state', () => {
    (expect(uid2) as any).toBeInAvailableState();
  });

  describe('when token refresh succeeds', () => {
    beforeEach(() => {
      freshTokenPromise = uid2.getFreshAdvertisingToken();
      xhrMock.responseText = btoa(JSON.stringify({ status: 'success', body: updatedIdentity }));
      xhrMock.onreadystatechange(new Event(''));
    });

    test('should invoke the callback', () => {
      expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        advertisingToken: updatedIdentity.advertising_token,
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

    test('freshTokenPromise should return new advertising token', async() => {
      expect(await freshTokenPromise).toEqual(updatedIdentity.advertising_token);
    });
  });

  describe('when token refresh returns optout', () => {
    let expection: any;
    beforeEach(async () => {
      try {
        freshTokenPromise = uid2.getFreshAdvertisingToken();
        xhrMock.responseText = btoa(JSON.stringify({ status: 'optout' }));
        xhrMock.onreadystatechange(new Event(''));
        await freshTokenPromise;
      } catch (err) {
        expection = err;
      }
    });
    test('freshTokenPromise should reject', () => {
      expect(expection).toEqual(new Error( 'No identity available.'));
    });
    test('should invoke the callback', () => {
      expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        advertisingToken: undefined,
        advertising_token: undefined,
        status: UID2.IdentityStatus.OPTOUT,
      }));
    });
    test('should clear cookie', () => {
      expect(getUid2Cookie()).toBeUndefined();
    });
    test('should not set refresh timer', () => {
      expect(setTimeout).not.toHaveBeenCalled();
      expect(clearTimeout).toHaveBeenCalledTimes(1);
    });
    test('should be in unavailable state', () => {
      (expect(uid2) as any).toBeInUnavailableState();
    });
  });

  describe('when token refresh returns refresh token expired', () => {
    let expection: any;
    beforeEach(async () => {
      try {
        freshTokenPromise = uid2.getFreshAdvertisingToken();
        xhrMock.responseText = btoa(JSON.stringify({ status: 'expired_token' }));
        xhrMock.onreadystatechange(new Event(''));
        await freshTokenPromise;
      } catch (err) {
        expection = err;
      }
    });
    test('freshTokenPromise should reject', () => {
      expect(expection).toEqual(new Error( 'No identity available.'));
    });
    test('should invoke the callback', () => {
      expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        advertisingToken: undefined,
        advertising_token: undefined,
        status: UID2.IdentityStatus.REFRESH_EXPIRED,
      }));
    });
    test('should clear cookie', () => {
      expect(getUid2Cookie()).toBeUndefined();
    });
    test('should not set refresh timer', () => {
      expect(setTimeout).not.toHaveBeenCalled();
      expect(clearTimeout).toHaveBeenCalledTimes(1);
    });
    test('should be in unavailable state', () => {
      (expect(uid2) as any).toBeInUnavailableState();
    });
    test('freshTokenPromise should reject', async() => {
      expect.assertions(1);
      try {
        await freshTokenPromise;
      } catch (err) {
        expect(err).toEqual(new Error( 'No identity available.'));
      }
    });
  });

  describe('when token refresh returns an error status', () => {
    let expection: any;
    beforeEach(async () => {
      try {
        freshTokenPromise = uid2.getFreshAdvertisingToken();
        xhrMock.responseText = JSON.stringify({ status: 'error', body: updatedIdentity });
        xhrMock.onreadystatechange(new Event(''));
        await freshTokenPromise;
      } catch (err) {
        expection = err;
      }
    });
    test('freshTokenPromise should return current advertising token', async() => {
      expect(await freshTokenPromise).toEqual(originalIdentity.advertising_token);
    });

    test('should not update cookie', () => {
      expect(getUid2Cookie().advertising_token).toBe(originalIdentity.advertising_token);
    });
    test('should set refresh timer', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).not.toHaveBeenCalled();
    });
    test('should be in available state', () => {
      (expect(uid2) as any).toBeInAvailableState(originalIdentity.advertising_token);
    });
  });

  describe('when token refresh fails and current identity expires', () => {
    let expection: any;
    beforeEach(async () => {
      try {
        freshTokenPromise = uid2.getFreshAdvertisingToken();
        jest.setSystemTime(originalIdentity.refresh_expires * 1000 + 1);
        xhrMock.responseText = JSON.stringify({ status: 'error' });
        xhrMock.onreadystatechange(new Event(''));
        await freshTokenPromise;
      } catch (err) {
        expection = err;
      }
    });

    test('freshTokenPromise should reject', () => {
      expect(expection).toEqual(new Error( 'No identity available.'));
    });

    test('should invoke the callback', () => {
      expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        advertisingToken: undefined,
        advertising_token: undefined,
        status: UID2.IdentityStatus.REFRESH_EXPIRED,
      }));
    });
    test('should clear cookie', () => {
      expect(getUid2Cookie()).toBeUndefined();
    });
    test('should not set refresh timer', () => {
      expect(setTimeout).not.toHaveBeenCalled();
      expect(clearTimeout).toHaveBeenCalledTimes(1);
    });
    test('should be in unavailable state', () => {
      (expect(uid2) as any).toBeInUnavailableState();
    });
  });
});

describe('when auto refreshing an expired identity', () => {
  const refreshFrom = Date.now() + 100;
  const originalIdentity = makeIdentity({
    advertising_token: 'original_advertising_token',
    identity_expires: refreshFrom,
    refresh_from: refreshFrom
  });
  const updatedIdentity = makeIdentity({
    advertising_token: 'updated_advertising_token'
  });

  beforeEach(() => {
    uid2.init({ callback: callback, identity: originalIdentity });
    jest.clearAllMocks();
    jest.setSystemTime(refreshFrom);
    jest.runOnlyPendingTimers();
  });

  test('should not invoke the callback', () => {
    expect(callback).not.toHaveBeenCalled();
  });
  test('should initiate token refresh', () => {
    expect(xhrMock.send).toHaveBeenCalledTimes(1);
  });
  test('should not set refresh timer', () => {
    expect(setTimeout).not.toHaveBeenCalled();
    expect(clearTimeout).not.toHaveBeenCalled();
  });
  test('should be in available state', () => {
    (expect(uid2) as any).toBeInTemporarilyUnavailableState();
  });

  describe('when token refresh succeeds', () => {
    beforeEach(() => {
      freshTokenPromise = uid2.getFreshAdvertisingToken();
      xhrMock.responseText = btoa(JSON.stringify({ status: 'success', body: updatedIdentity }));
      xhrMock.onreadystatechange(new Event(''));
    });

    test('should invoke the callback', () => {
      expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        advertisingToken: updatedIdentity.advertising_token,
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
    test('freshTokenPromise should return new advertising token', async() => {
      expect(await freshTokenPromise).toEqual(updatedIdentity.advertising_token);
    });
  });

  describe('when token refresh returns optout', () => {
    let expection: any;
    beforeEach(async () => {
      try {
        freshTokenPromise = uid2.getFreshAdvertisingToken();
        xhrMock.responseText = btoa(JSON.stringify({ status: 'optout' }));
        xhrMock.onreadystatechange(new Event(''));
        await freshTokenPromise;
      } catch (err) {
        expection = err;
      }
    });
    test('freshTokenPromise should reject', () => {
      expect(expection).toEqual(new Error( 'No identity available.'));
    });
    test('should invoke the callback', () => {
      expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        advertisingToken: undefined,
        advertising_token: undefined,
        status: UID2.IdentityStatus.OPTOUT,
      }));
    });
    test('should clear cookie', () => {
      expect(getUid2Cookie()).toBeUndefined();
    });
    test('should not set refresh timer', () => {
      expect(setTimeout).not.toHaveBeenCalled();
      expect(clearTimeout).toHaveBeenCalledTimes(1);
    });
    test('should be in unavailable state', () => {
      (expect(uid2) as any).toBeInUnavailableState();
    });
  });

  describe('when token refresh returns refresh token expired', () => {
    let expection: any;
    beforeEach(async () => {
      try {
        freshTokenPromise = uid2.getFreshAdvertisingToken();
        xhrMock.responseText = btoa(JSON.stringify({ status: 'expired_token' }));
        xhrMock.onreadystatechange(new Event(''));
        await freshTokenPromise;
      } catch (err) {
        expection = err;
      }
    });
    test('freshTokenPromise should reject', () => {
      expect(expection).toEqual(new Error( 'No identity available.'));
    });
    test('should invoke the callback', () => {
      expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        advertisingToken: undefined,
        advertising_token: undefined,
        status: UID2.IdentityStatus.REFRESH_EXPIRED,
      }));
    });
    test('should clear cookie', () => {
      expect(getUid2Cookie()).toBeUndefined();
    });
    test('should not set refresh timer', () => {
      expect(setTimeout).not.toHaveBeenCalled();
      expect(clearTimeout).toHaveBeenCalledTimes(1);
    });
    test('should be in unavailable state', () => {
      (expect(uid2) as any).toBeInUnavailableState();
    });
  });

  describe('when token refresh returns an error status', () => {
    let expection: any;
    beforeEach(async () => {
      try {
        freshTokenPromise = uid2.getFreshAdvertisingToken();
        xhrMock.responseText = JSON.stringify({ status: 'error', body: updatedIdentity });
        xhrMock.onreadystatechange(new Event(''));
        await freshTokenPromise;
      } catch (err) {
        expection = err;
      }
    });
    test('freshTokenPromise should reject', () => {
      expect(expection).toEqual(new Error( 'No identity available.'));
    });
    test('should not update cookie', () => {
      expect(getUid2Cookie().advertising_token).toBe(originalIdentity.advertising_token);
    });
    test('should set refresh timer', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).not.toHaveBeenCalled();
    });
    test('should be in temporarily unavailable state', () => {
      (expect(uid2) as any).toBeInTemporarilyUnavailableState(originalIdentity.advertising_token);
    });
  });

  describe('when token refresh fails and current identity expires', () => {
    let expection: any;
    beforeEach(async () => {
      try {
        freshTokenPromise = uid2.getFreshAdvertisingToken();
        jest.setSystemTime(originalIdentity.refresh_expires * 1000 + 1);
        xhrMock.responseText = JSON.stringify({ status: 'error' });
        xhrMock.onreadystatechange(new Event(''));
        await freshTokenPromise;
      } catch (err) {
        expection = err;
      }
    });

    test('freshTokenPromise should reject', () => {
      expect(expection).toEqual(new Error( 'No identity available.'));
    });

    test('should invoke the callback', () => {
      expect(callback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        advertisingToken: undefined,
        advertising_token: undefined,
        status: UID2.IdentityStatus.REFRESH_EXPIRED,
      }));
    });
    test('should clear cookie', () => {
      expect(getUid2Cookie()).toBeUndefined();
    });
    test('should not set refresh timer', () => {
      expect(setTimeout).not.toHaveBeenCalled();
      expect(clearTimeout).toHaveBeenCalledTimes(1);
    });
    test('should be in unavailable state', () => {
      (expect(uid2) as any).toBeInUnavailableState();
    });
  });
});

