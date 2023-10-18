import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

import * as mocks from "../mocks";
import { sdkWindow, UID2 } from "../uid2Sdk";

let callback: any;
let uid2: UID2;
let xhrMock: any;
let getAdvertisingTokenPromise: Promise<string | undefined>;

mocks.setupFakeTime();

beforeEach(() => {
  callback = jest.fn();
  uid2 = new UID2();
  xhrMock = new mocks.XhrMock(sdkWindow);
  mocks.setCookieMock(sdkWindow.document);
  removeUid2Cookie();
  removeUid2LocalStorage();
});

afterEach(() => {
  mocks.resetFakeTime();
});

const getUid2 = mocks.getUid2;
const makeIdentity = mocks.makeIdentityV2;
const removeUid2Cookie = mocks.removeUid2Cookie;
const removeUid2LocalStorage = mocks.removeUid2LocalStorage;

let useCookie: boolean | undefined = undefined;

const testCookieAndLocalStorage = (test: () => void, only = false) => {
  const describeFn = only ? describe.only : describe;
  describeFn("Using default: ", () => {
    beforeEach(() => {
      useCookie = undefined;
    });
    test();
  });
  describeFn("Using cookies ", () => {
    beforeEach(() => {
      useCookie = true;
    });
    test();
  });
  describeFn("Using local storage ", () => {
    beforeEach(() => {
      useCookie = false;
    });
    test();
  });
};

testCookieAndLocalStorage(() => {
  describe("when auto refreshing a non-expired identity which does not require a refresh", () => {
    const originalIdentity = makeIdentity({
      advertising_token: "original_advertising_token",
    });
    beforeEach(() => {
      getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
      jest.clearAllMocks();
      jest.runOnlyPendingTimers();
      uid2.init({
        callback: callback,
        identity: originalIdentity,
        useCookie: useCookie,
      });
    });

    test("should invoke the callback", () => {
      expect(sdkWindow.crypto).toBeDefined();
      expect(callback).toHaveBeenCalledTimes(1);
    });
    test("should not initiate token refresh", () => {
      expect(xhrMock.send).not.toHaveBeenCalled();
    });
    test("should set refresh timer", () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).not.toBeCalled();
    });
    test("should be in available state", () => {
      (expect(uid2) as any).toBeInAvailableState();
    });

    test("getAdvertisingTokenAsync should return current advertising token", async () => {
      expect(await getAdvertisingTokenPromise).toEqual(
        originalIdentity.advertising_token
      );
    });
  });

  describe("when auto refreshing a non-expired identity which requires a refresh", () => {
    const refreshFrom = Date.now() + 100;
    const originalIdentity = makeIdentity({
      advertising_token: "original_advertising_token",
      refresh_from: refreshFrom,
    });
    const updatedIdentity = makeIdentity({
      advertising_token: "updated_advertising_token",
    });

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: originalIdentity,
        useCookie: useCookie,
      });
      jest.clearAllMocks();
      jest.setSystemTime(refreshFrom);
      jest.runOnlyPendingTimers();
    });

    test("should not invoke the callback", () => {
      expect(callback).not.toHaveBeenCalled();
    });
    test("should initiate token refresh", () => {
      expect(xhrMock.send).toHaveBeenCalledTimes(1);
    });
    test("should not set refresh timer", () => {
      expect(setTimeout).not.toHaveBeenCalled();
      expect(clearTimeout).not.toHaveBeenCalled();
    });
    test("should be in available state", () => {
      (expect(uid2) as any).toBeInAvailableState();
    });

    describe("when token refresh succeeds", () => {
      beforeEach(async () => {
        getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
        await xhrMock.sendIdentityInEncodedResponse(
          updatedIdentity,
          originalIdentity.refresh_response_key
        );
        await getAdvertisingTokenPromise;
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: updatedIdentity.advertising_token,
            advertising_token: updatedIdentity.advertising_token,
            status: UID2.IdentityStatus.REFRESHED,
          })
        );
      });
      test("should store value", () => {
        expect(getUid2(useCookie).advertising_token).toBe(
          updatedIdentity.advertising_token
        );
      });
      test("should set refresh timer", () => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in available state", () => {
        (expect(uid2) as any).toBeInAvailableState(
          updatedIdentity.advertising_token
        );
      });

      test("getAdvertisingTokenAsync should return new advertising token", async () => {
        expect(await getAdvertisingTokenPromise).toEqual(
          updatedIdentity.advertising_token
        );
      });
    });

    describe("when token refresh returns optout", () => {
      let exception: any;
      beforeEach(async () => {
        try {
          getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
          await xhrMock.sendEncodedRefreshApiResponse(
            "optout",
            originalIdentity.refresh_response_key
          );
          await getAdvertisingTokenPromise;
        } catch (err) {
          exception = err;
        }
      });
      test("getAdvertisingTokenPromise should reject", () => {
        expect(exception).toEqual(new Error("UID2 SDK aborted."));
      });
      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.OPTOUT,
          })
        );
      });
      test("should clear value", () => {
        expect(getUid2(useCookie)).toBeNull();
      });
      test("should not set refresh timer", () => {
        expect(setTimeout).not.toHaveBeenCalled();
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in unavailable state", () => {
        (expect(uid2) as any).toBeInUnavailableState();
      });
    });

    describe("when token refresh returns refresh token expired", () => {
      let exception: any;
      beforeEach(async () => {
        try {
          getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
          await xhrMock.sendEncodedRefreshApiResponse(
            "expired_token",
            originalIdentity.refresh_response_key
          );
          await getAdvertisingTokenPromise;
        } catch (err) {
          exception = err;
        }
      });
      test("getAdvertisingTokenPromise should reject", () => {
        expect(exception).toEqual(new Error("UID2 SDK aborted."));
      });
      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.REFRESH_EXPIRED,
          })
        );
      });
      test("should clear value", () => {
        expect(getUid2(useCookie)).toBeNull();
      });
      test("should not set refresh timer", () => {
        expect(setTimeout).not.toHaveBeenCalled();
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in unavailable state", () => {
        (expect(uid2) as any).toBeInUnavailableState();
      });
    });

    describe("when token refresh returns an error status", () => {
      let exception: any;
      beforeEach(async () => {
        try {
          getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
          await xhrMock.sendEncodedRefreshApiResponse(
            "error",
            originalIdentity.refresh_response_key
          );
          await getAdvertisingTokenPromise;
        } catch (err) {
          exception = err;
        }
      });
      test("getAdvertisingTokenPromise should return current advertising token", async () => {
        expect(await getAdvertisingTokenPromise).toEqual(
          originalIdentity.advertising_token
        );
      });

      test("should not update value", () => {
        expect(getUid2(useCookie).advertising_token).toBe(
          originalIdentity.advertising_token
        );
      });
      test("should set refresh timer", () => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in available state", () => {
        (expect(uid2) as any).toBeInAvailableState(
          originalIdentity.advertising_token
        );
      });
    });

    describe("when token refresh fails and current identity expires", () => {
      let exception: any;
      beforeEach(async () => {
        try {
          getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
          jest.setSystemTime(originalIdentity.refresh_expires * 1000 + 1);
          await xhrMock.sendEncodedRefreshApiResponse(
            "error",
            originalIdentity.refresh_response_key
          );
          await getAdvertisingTokenPromise;
        } catch (err) {
          exception = err;
        }
      });

      test("getAdvertisingTokenPromise should reject", () => {
        expect(exception).toEqual(new Error("UID2 SDK aborted."));
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.REFRESH_EXPIRED,
          })
        );
      });
      test("should clear value", () => {
        expect(getUid2(useCookie)).toBeNull();
      });
      test("should not set refresh timer", () => {
        expect(setTimeout).not.toHaveBeenCalled();
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in unavailable state", () => {
        (expect(uid2) as any).toBeInUnavailableState();
      });
    });

    describe("when a new token is set using setIdentity", () => {
      const manualSetIdentity = makeIdentity({
        advertising_token: "manual_set_advertising_token",
      });
      beforeEach(() => {
        uid2.setIdentity(manualSetIdentity);
        getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
      });

      test("should abort the refreshing request", () => {
        expect(xhrMock.abort).toHaveBeenCalledTimes(1);
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: manualSetIdentity.advertising_token,
            advertising_token: manualSetIdentity.advertising_token,
            status: UID2.IdentityStatus.REFRESHED,
          })
        );
      });
      test("should store value", () => {
        expect(getUid2(useCookie).advertising_token).toBe(
          manualSetIdentity.advertising_token
        );
      });
      test("should set refresh timer", () => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in available state", () => {
        (expect(uid2) as any).toBeInAvailableState(
          manualSetIdentity.advertising_token
        );
      });

      test("getAdvertisingTokenAsync should return manual set token", async () => {
        expect(await getAdvertisingTokenPromise).toEqual(
          manualSetIdentity.advertising_token
        );
      });
    });
  });

  describe("when auto refreshing an expired identity", () => {
    const refreshFrom = Date.now() + 100;
    const originalIdentity = makeIdentity({
      advertising_token: "original_advertising_token",
      identity_expires: refreshFrom,
      refresh_from: refreshFrom,
    });
    const updatedIdentity = makeIdentity({
      advertising_token: "updated_advertising_token",
    });

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: originalIdentity,
        useCookie: useCookie,
      });
      jest.clearAllMocks();
      jest.setSystemTime(refreshFrom);
      jest.runOnlyPendingTimers();
    });

    test("should not invoke the callback", () => {
      expect(callback).not.toHaveBeenCalled();
    });
    test("should initiate token refresh", () => {
      expect(xhrMock.send).toHaveBeenCalledTimes(1);
    });
    test("should not set refresh timer", () => {
      expect(setTimeout).not.toHaveBeenCalled();
      expect(clearTimeout).not.toHaveBeenCalled();
    });
    test("should be in available state", () => {
      (expect(uid2) as any).toBeInTemporarilyUnavailableState();
    });

    describe("when token refresh succeeds", () => {
      beforeEach(async () => {
        getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
        await xhrMock.sendIdentityInEncodedResponse(
          updatedIdentity,
          originalIdentity.refresh_response_key
        );
        await getAdvertisingTokenPromise;
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: updatedIdentity.advertising_token,
            advertising_token: updatedIdentity.advertising_token,
            status: UID2.IdentityStatus.REFRESHED,
          })
        );
      });
      test("should store value", () => {
        expect(getUid2(useCookie).advertising_token).toBe(
          updatedIdentity.advertising_token
        );
      });
      test("should set refresh timer", () => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in available state", () => {
        (expect(uid2) as any).toBeInAvailableState(
          updatedIdentity.advertising_token
        );
      });
      test("getAdvertisingTokenPromise should return new advertising token", async () => {
        expect(await getAdvertisingTokenPromise).toEqual(
          updatedIdentity.advertising_token
        );
      });
    });

    describe("when token refresh returns optout", () => {
      let exception: any;
      beforeEach(async () => {
        try {
          getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
          await xhrMock.sendEncodedRefreshApiResponse(
            "optout",
            originalIdentity.refresh_response_key
          );
          await getAdvertisingTokenPromise;
        } catch (err) {
          exception = err;
        }
      });
      test("getAdvertisingTokenPromise should reject", () => {
        expect(exception).toEqual(new Error("UID2 SDK aborted."));
      });
      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.OPTOUT,
          })
        );
      });
      test("should clear value", () => {
        expect(getUid2(useCookie)).toBeNull();
      });
      test("should not set refresh timer", () => {
        expect(setTimeout).not.toHaveBeenCalled();
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in unavailable state", () => {
        (expect(uid2) as any).toBeInUnavailableState();
      });
    });

    describe("when token refresh returns refresh token expired", () => {
      let exception: any;
      beforeEach(async () => {
        try {
          getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
          await xhrMock.sendEncodedRefreshApiResponse(
            "expired_token",
            originalIdentity.refresh_response_key
          );
          await getAdvertisingTokenPromise;
        } catch (err) {
          exception = err;
        }
      });
      test("getAdvertisingTokenPromise should reject", () => {
        expect(exception).toEqual(new Error("UID2 SDK aborted."));
      });
      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.REFRESH_EXPIRED,
          })
        );
      });
      test("should clear value", () => {
        expect(getUid2(useCookie)).toBeNull();
      });
      test("should not set refresh timer", () => {
        expect(setTimeout).not.toHaveBeenCalled();
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in unavailable state", () => {
        (expect(uid2) as any).toBeInUnavailableState();
      });
    });

    describe("when token refresh returns an error status", () => {
      let exception: any;
      beforeEach(async () => {
        try {
          getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
          await xhrMock.sendEncodedRefreshApiResponse(
            "error",
            originalIdentity.refresh_response_key
          );
          await getAdvertisingTokenPromise;
        } catch (err) {
          exception = err;
        }
      });
      test("getAdvertisingTokenPromise should reject", () => {
        expect(exception).toEqual(new Error("No identity available."));
      });
      test("should not update value", () => {
        expect(getUid2(useCookie).advertising_token).toBe(
          originalIdentity.advertising_token
        );
      });
      test("should set refresh timer", () => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in temporarily unavailable state", () => {
        (expect(uid2) as any).toBeInTemporarilyUnavailableState(
          originalIdentity.advertising_token
        );
      });
    });

    describe("when token refresh fails and current identity expires", () => {
      let exception: any;
      beforeEach(async () => {
        try {
          getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
          jest.setSystemTime(originalIdentity.refresh_expires * 1000 + 1);
          await xhrMock.sendEncodedRefreshApiResponse(
            "error",
            originalIdentity.refresh_response_key
          );
          await getAdvertisingTokenPromise;
        } catch (err) {
          exception = err;
        }
      });

      test("getAdvertisingTokenPromise should reject", () => {
        expect(exception).toEqual(new Error("UID2 SDK aborted."));
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.REFRESH_EXPIRED,
          })
        );
      });
      test("should clear value", () => {
        expect(getUid2(useCookie)).toBeNull();
      });
      test("should not set refresh timer", () => {
        expect(setTimeout).not.toHaveBeenCalled();
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in unavailable state", () => {
        (expect(uid2) as any).toBeInUnavailableState();
      });
    });
  });
});
