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
import { EventType } from "../uid2CallbackManager";

let callback: any;
let uid2: UID2;
let xhrMock: any;
let advertisingTokenRefreshedPromise: Promise<string | undefined>;

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
const setUid2 = mocks.setUid2;
const removeUid2Cookie = mocks.removeUid2Cookie;
const removeUid2LocalStorage = mocks.removeUid2LocalStorage;
const makeIdentityV1 = mocks.makeIdentityV1;
const makeIdentityV2 = mocks.makeIdentityV2;

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
  describe("When google tag setup is called", () => {
    test("should not fail when there is no googletag", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      sdkWindow.googletag = null;
      expect(() => UID2.setupGoogleTag()).not.toThrow(TypeError);
    });
    test("should not fail when there is no googletag secureSignalProviders and no uid2SecureSignalProvider", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      sdkWindow.googletag = { secureSignalProviders: null };
      expect(() => UID2.setupGoogleTag()).not.toThrow(TypeError);
    });

    test("should not fail when there is no uid2SecureSignalProvider", () => {
      const mockPush = jest.fn();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      sdkWindow.googletag = { secureSignalProviders: { push: mockPush } };
      expect(() => UID2.setupGoogleTag()).not.toThrow(TypeError);
      expect(mockPush.mock.calls.length).toBe(0);
    });

    test("should push if googletag has secureSignalProviders", () => {
      const mockRegister = jest.fn();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      sdkWindow.__uid2SecureSignalProvider = {
        registerSecureSignalProvider: mockRegister,
      };
      UID2.setupGoogleTag();
      expect(mockRegister.mock.calls.length).toBe(1);
    });
  });

  describe("initial state before init() is called", () => {
    test("should be in initialising state", () => {
      (expect(uid2) as any).toBeInInitialisingState();
    });

    test("getAdvertisingToken should return undefined", () => {
      expect(uid2.getAdvertisingToken()).toBeUndefined();
    });
  });

  describe("when initialising with invalid options", () => {
    test("should fail on no opts", () => {
      expect(() => (uid2 as any).init()).toThrow(TypeError);
    });
    test("should fail on opts not being an object", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => uid2.init(12345)).toThrow(TypeError);
    });
    test("should fail on opts being null", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => uid2.init(null)).toThrow(TypeError);
    });
    test("should work on no callback provided", () => {
      expect(() => uid2.init({})).not.toThrow(TypeError);
    });
    test("should fail on callback not being a function", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => uid2.init({ callback: 12345 })).toThrow(TypeError);
    });
    test("should fail on refreshRetryPeriod not being a number", () => {
      expect(() =>
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        uid2.init({ callback: () => {}, refreshRetryPeriod: "abc" })
      ).toThrow(TypeError);
    });
    test("should fail on refreshRetryPeriod being less than 1 second", () => {
      expect(() =>
        uid2.init({ callback: () => {}, refreshRetryPeriod: 1 })
      ).toThrow(RangeError);
    });
  });

  test("init() should fail if called multiple times", () => {
    uid2.init({ callback: () => {} });
    expect(() => uid2.init({ callback: () => {} })).toThrow();
  });

  describe("when initialised without identity", () => {
    describe("when uid2 value is not available", () => {
      beforeEach(() => {
        uid2.init({ callback: callback, useCookie: useCookie });
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.NO_IDENTITY,
          })
        );
      });
      test("should not set value", () => {
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

    describe("when uid2 value with invalid JSON is available", () => {
      beforeEach(() => {
        setUid2({}, useCookie);
        uid2.init({ callback: callback, useCookie: useCookie });
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.NO_IDENTITY,
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

    describe("when uid2 value with up-to-date identity is available v2", () => {
      const identity = makeIdentityV2();

      beforeEach(() => {
        setUid2(identity, useCookie);
        uid2.init({ callback: callback, useCookie: useCookie });
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: identity.advertising_token,
            advertising_token: identity.advertising_token,
            status: UID2.IdentityStatus.ESTABLISHED,
          })
        );
      });
      test("should set value", () => {
        expect(getUid2(useCookie).advertising_token).toBe(
          identity.advertising_token
        );
      });
      test("should set refresh timer", () => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in available state", () => {
        (expect(uid2) as any).toBeInAvailableState(identity.advertising_token);
      });
    });

    describe("when uid2 cookie with expired refresh is available", () => {
      const identity = makeIdentityV2({
        refresh_expires: Date.now() - 100000,
      });

      beforeEach(() => {
        setUid2(identity, useCookie);
        uid2.init({ callback: callback, useCookie: useCookie });
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

    describe("when uid2 cookie with valid but refreshable identity is available", () => {
      const identity = makeIdentityV2({
        refresh_from: Date.now() - 100000,
      });

      beforeEach(() => {
        setUid2(identity, useCookie);
        uid2.init({ callback: callback, useCookie: useCookie });
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
    });

    describe("when uid2 v2 cookie with expired but refreshable identity is available", () => {
      const identity = makeIdentityV2({
        identity_expires: Date.now() - 100000,
        refresh_from: Date.now() - 100000,
      });

      beforeEach(() => {
        xhrMock.open.mockClear();
        xhrMock.send.mockClear();
        setUid2(identity, useCookie);
        uid2.init({ callback: callback, useCookie: useCookie });
      });

      afterEach(() => {
        xhrMock.open.mockClear();
        xhrMock.send.mockClear();
      });

      test("should initiate token refresh", () => {
        expect(xhrMock.send).toHaveBeenCalledTimes(1);
        const url = "https://prod.uidapi.com/v2/token/refresh";
        expect(xhrMock.open).toHaveBeenLastCalledWith("POST", url, true);
        expect(xhrMock.send).toHaveBeenLastCalledWith(identity.refresh_token);
      });

      test("should not set refresh timer", () => {
        expect(setTimeout).not.toHaveBeenCalled();
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in initialising state", () => {
        (expect(uid2) as any).toBeInTemporarilyUnavailableState();
      });
    });
    describe("when uid2 v1 cookie with expired but refreshable identity is available", () => {
      const identity = makeIdentityV1({
        identity_expires: Date.now() - 100000,
        refresh_from: Date.now() - 100000,
      });

      beforeEach(() => {
        setUid2(identity, useCookie);
        uid2.init({ callback: callback, useCookie: useCookie });
      });

      test("should initiate token refresh", () => {
        expect(xhrMock.send).toHaveBeenCalledTimes(1);
        const url = "https://prod.uidapi.com/v2/token/refresh";
        expect(xhrMock.open).toHaveBeenLastCalledWith("POST", url, true);
        expect(xhrMock.send).toHaveBeenLastCalledWith(identity.refresh_token);
      });
    });
  });

  describe("when initialised with specific identity", () => {
    describe("when invalid identity is supplied", () => {
      beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        uid2.init({ callback: callback, identity: {}, useCookie: useCookie });
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.INVALID,
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

    describe("when valid v2 identity is supplied", () => {
      const identity = makeIdentityV2();

      beforeEach(() => {
        uid2.init({
          callback: callback,
          identity: identity,
          useCookie: useCookie,
        });
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: identity.advertising_token,
            advertising_token: identity.advertising_token,
            status: UID2.IdentityStatus.ESTABLISHED,
          })
        );
      });
      test("should set value", () => {
        expect(getUid2(useCookie).advertising_token).toBe(
          identity.advertising_token
        );
      });
      test("should set refresh timer", () => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in available state", () => {
        (expect(uid2) as any).toBeInAvailableState(identity.advertising_token);
      });
    });

    describe("when valid identity is supplied and existing value is available", () => {
      const initIdentity = makeIdentityV2({
        advertising_token: "init_advertising_token",
      });
      const existingIdentity = makeIdentityV2({
        advertising_token: "existing_advertising_token",
      });

      beforeEach(() => {
        setUid2(existingIdentity, useCookie);
        uid2.init({
          callback: callback,
          identity: initIdentity,
          useCookie: useCookie,
        });
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: initIdentity.advertising_token,
            advertising_token: initIdentity.advertising_token,
            status: UID2.IdentityStatus.ESTABLISHED,
          })
        );
      });
      test("should set value", () => {
        expect(getUid2(useCookie).advertising_token).toBe(
          initIdentity.advertising_token
        );
      });
      test("should set refresh timer", () => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in available state", () => {
        (expect(uid2) as any).toBeInAvailableState(
          initIdentity.advertising_token
        );
      });
    });
  });

  describe("when still valid identity is refreshed on init", () => {
    const originalIdentity = makeIdentityV2({
      advertising_token: "original_advertising_token",
      refresh_from: Date.now() - 100000,
    });
    const updatedIdentity = makeIdentityV2({
      advertising_token: "updated_advertising_token",
    });

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: originalIdentity,
        useCookie: useCookie,
      });
    });

    describe("when token refresh succeeds", () => {
      beforeEach(async () => {
        advertisingTokenRefreshedPromise = uid2.getAdvertisingTokenAsync();
        await xhrMock.sendIdentityInEncodedResponse(
          updatedIdentity,
          originalIdentity.refresh_response_key
        );
        await advertisingTokenRefreshedPromise;
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenLastCalledWith(
          expect.objectContaining({
            advertisingToken: updatedIdentity.advertising_token,
            advertising_token: updatedIdentity.advertising_token,
            status: UID2.IdentityStatus.REFRESHED,
          })
        );
      });

      test("should set value", () => {
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
    });

    describe("when token refresh returns invalid response", () => {
      beforeEach(async () => {
        advertisingTokenRefreshedPromise = uid2.getAdvertisingTokenAsync();
        xhrMock.responseText = "abc";
        xhrMock.onreadystatechange(new Event(""));
        await advertisingTokenRefreshedPromise;
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: originalIdentity.advertising_token,
            advertising_token: originalIdentity.advertising_token,
            status: UID2.IdentityStatus.ESTABLISHED,
          })
        );
      });
      test("should set value", () => {
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

    describe("when token refresh returns optout", () => {
      beforeEach(async () => {
        try {
          advertisingTokenRefreshedPromise = uid2.getAdvertisingTokenAsync();
          await xhrMock.sendEncodedRefreshApiResponse(
            "optout",
            originalIdentity.refresh_response_key
          );
          await advertisingTokenRefreshedPromise;
        } catch (_err) {
          // it will throw uid2 abort error
        }
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenLastCalledWith(
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.OPTOUT,
          })
        );
      });
      test("should not set cookie", () => {
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

    describe("when token refresh returns expired token", () => {
      beforeEach(() => {
        xhrMock.responseText = JSON.stringify({ status: "expired_token" });
        xhrMock.status = 400;
        xhrMock.onreadystatechange(new Event(""));
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenLastCalledWith(
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.REFRESH_EXPIRED,
          })
        );
      });
      test("should not set cookie", () => {
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
      beforeEach(() => {
        xhrMock.responseText = JSON.stringify({
          status: "error",
          body: updatedIdentity,
        });
        xhrMock.onreadystatechange(new Event(""));
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: originalIdentity.advertising_token,
            advertising_token: originalIdentity.advertising_token,
            status: UID2.IdentityStatus.ESTABLISHED,
          })
        );
      });
      test("should set value", () => {
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

    describe("when token refresh returns no body", () => {
      beforeEach(() => {
        xhrMock.responseText = JSON.stringify({ status: "success" });
        xhrMock.onreadystatechange(new Event(""));
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: originalIdentity.advertising_token,
            advertising_token: originalIdentity.advertising_token,
            status: UID2.IdentityStatus.ESTABLISHED,
          })
        );
      });
      test("should set value", () => {
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

    describe("when token refresh returns incorrect body type", () => {
      beforeEach(() => {
        xhrMock.responseText = JSON.stringify({ status: "success", body: 5 });
        xhrMock.onreadystatechange(new Event(""));
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: originalIdentity.advertising_token,
            advertising_token: originalIdentity.advertising_token,
            status: UID2.IdentityStatus.ESTABLISHED,
          })
        );
      });
      test("should set value", () => {
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

    describe("when token refresh returns invalid body", () => {
      beforeEach(() => {
        xhrMock.responseText = JSON.stringify({ status: "success", body: {} });
        xhrMock.onreadystatechange(new Event(""));
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: originalIdentity.advertising_token,
            advertising_token: originalIdentity.advertising_token,
            status: UID2.IdentityStatus.ESTABLISHED,
          })
        );
      });
      test("should set value", () => {
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
      beforeEach(() => {
        jest.setSystemTime(originalIdentity.refresh_expires * 1000 + 1);
        xhrMock.responseText = JSON.stringify({ status: "error" });
        xhrMock.onreadystatechange(new Event(""));
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenLastCalledWith(
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.REFRESH_EXPIRED,
          })
        );
      });
      test("should not set cookie", () => {
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

  describe("when expired identity is refreshed on init", () => {
    const originalIdentity = makeIdentityV2({
      advertising_token: "original_advertising_token",
      refresh_from: Date.now() - 100000,
      identity_expires: Date.now() - 1,
    });
    const updatedIdentity = makeIdentityV2({
      advertising_token: "updated_advertising_token",
    });

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: originalIdentity,
        useCookie: useCookie,
      });
    });

    describe("when token refresh succeeds", () => {
      beforeEach(async () => {
        const getAdvertisingTokenPromise = uid2.getAdvertisingTokenAsync();
        await xhrMock.sendIdentityInEncodedResponse(
          updatedIdentity,
          originalIdentity.refresh_response_key
        );
        await getAdvertisingTokenPromise;
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            advertisingToken: updatedIdentity.advertising_token,
            advertising_token: updatedIdentity.advertising_token,
            status: UID2.IdentityStatus.REFRESHED,
          })
        );
      });
      test("should set value", () => {
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
    });

    describe("when token refresh returns optout", () => {
      beforeEach(async () => {
        try {
          advertisingTokenRefreshedPromise = uid2.getAdvertisingTokenAsync();
          await xhrMock.sendEncodedRefreshApiResponse(
            "optout",
            originalIdentity.refresh_response_key
          );
          await advertisingTokenRefreshedPromise;
        } catch (_err) {
          // it will throw uid2 abort error
        }
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenLastCalledWith(
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.OPTOUT,
          })
        );
      });
      test("should not set cookie", () => {
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

    describe("when token refresh returns expired token", () => {
      beforeEach(() => {
        xhrMock.responseText = JSON.stringify({ status: "expired_token" });
        xhrMock.status = 400;
        xhrMock.onreadystatechange(new Event(""));
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.REFRESH_EXPIRED,
          })
        );
      });
      test("should not set cookie", () => {
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
      beforeEach(() => {
        xhrMock.responseText = JSON.stringify({
          status: "error",
          body: updatedIdentity,
        });
        xhrMock.onreadystatechange(new Event(""));
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.EXPIRED,
          })
        );
      });
      test("should set value", () => {
        expect(getUid2(useCookie).advertising_token).toBe(
          originalIdentity.advertising_token
        );
      });
      test("should set refresh timer", () => {
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).not.toHaveBeenCalled();
      });
      test("should be in temporarily unavailable state", () => {
        (expect(uid2) as any).toBeInTemporarilyUnavailableState();
      });
    });

    describe("when token refresh fails and current identity expires", () => {
      beforeEach(() => {
        jest.setSystemTime(originalIdentity.refresh_expires * 1000 + 1);
        xhrMock.responseText = JSON.stringify({ status: "error" });
        xhrMock.onreadystatechange(new Event(""));
      });

      test("should invoke the callback", () => {
        expect(callback).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            advertisingToken: undefined,
            advertising_token: undefined,
            status: UID2.IdentityStatus.REFRESH_EXPIRED,
          })
        );
      });
      test("should not set cookie", () => {
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

  describe("abort()", () => {
    test("should not clear cookie", () => {
      const identity = makeIdentityV2();
      setUid2(identity, useCookie);
      uid2.abort();
      expect(getUid2(useCookie).advertising_token).toBe(
        identity.advertising_token
      );
    });
    test("should abort refresh timer", () => {
      uid2.init({
        callback: callback,
        identity: makeIdentityV2(),
        useCookie: useCookie,
      });
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).not.toHaveBeenCalled();
      uid2.abort();
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).toHaveBeenCalledTimes(1);
    });
    test("should not abort refresh timer if not timer is set", () => {
      uid2.init({
        callback: callback,
        identity: makeIdentityV2({ refresh_from: Date.now() - 100000 }),
        useCookie: useCookie,
      });
      expect(setTimeout).not.toHaveBeenCalled();
      expect(clearTimeout).not.toHaveBeenCalled();
      uid2.abort();
      expect(setTimeout).not.toHaveBeenCalled();
      expect(clearTimeout).not.toHaveBeenCalled();
    });
    test("should abort refresh token request", () => {
      uid2.init({
        callback: callback,
        identity: makeIdentityV2({ refresh_from: Date.now() - 100000 }),
        useCookie: useCookie,
      });
      expect(xhrMock.send).toHaveBeenCalledTimes(1);
      expect(xhrMock.abort).not.toHaveBeenCalled();
      uid2.abort();
      expect(xhrMock.send).toHaveBeenCalledTimes(1);
      expect(xhrMock.abort).toHaveBeenCalledTimes(1);
    });
    test("should prevent subsequent calls to init()", () => {
      uid2.abort();
      expect(() => uid2.init({ callback: () => {} })).toThrow();
    });
  });

  describe("disconnect()", () => {
    test("should clear cookie", () => {
      setUid2(makeIdentityV2(), useCookie);
      uid2.disconnect();
      expect(getUid2(useCookie)).toBeNull();
    });
    test("should abort refresh timer", () => {
      uid2.init({
        callback: callback,
        identity: makeIdentityV2(),
        useCookie: useCookie,
      });
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).not.toHaveBeenCalled();
      uid2.disconnect();
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).toHaveBeenCalledTimes(1);
    });
    test("should abort refresh token request", () => {
      uid2.init({
        callback: callback,
        identity: makeIdentityV2({ refresh_from: Date.now() - 100000 }),
        useCookie: useCookie,
      });
      expect(xhrMock.send).toHaveBeenCalledTimes(1);
      expect(xhrMock.abort).not.toHaveBeenCalled();
      uid2.disconnect();
      expect(xhrMock.send).toHaveBeenCalledTimes(1);
      expect(xhrMock.abort).toHaveBeenCalledTimes(1);
    });
    test("should prevent subsequent calls to init()", () => {
      uid2.disconnect();
      expect(() => uid2.init({ callback: () => {} })).toThrow();
    });
    test("should switch to unavailable state", () => {
      uid2.init({
        callback: callback,
        identity: makeIdentityV2(),
        useCookie: useCookie,
      });
      uid2.disconnect();
      (expect(uid2) as any).toBeInUnavailableState();
    });
  });
});
