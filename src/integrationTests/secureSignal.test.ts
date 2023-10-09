import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import * as mocks from "../mocks";
import {
  getUid2AdvertisingTokenWithRetry,
  Uid2SecureSignalProvider,
  __uid2SSProviderScriptLoad,
} from "../secureSignal";
import { UID2, __uid2InternalHandleScriptLoad } from "../uid2Sdk";

let consoleWarnMock: any;
let getAdvertisingTokenMock: jest.Mock<() => Promise<string>>;
let secureSignalProvidersPushMock: jest.Mock<(p: any) => Promise<void>>;
let uid2ESP: Uid2SecureSignalProvider;
let xhrMock: any;
mocks.setupFakeTime();

describe("Secure Signal Tests", () => {
  beforeEach(() => {
    getAdvertisingTokenMock = jest.fn<() => Promise<string>>();
    secureSignalProvidersPushMock = jest.fn(
      async (p) => await p.collectorFunction()
    );
    window.googletag = {
      secureSignalProviders: {
        push: secureSignalProvidersPushMock,
      },
    };
    consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {
      return;
    });
  });

  afterEach(() => {
    consoleWarnMock.mockRestore();
    getAdvertisingTokenMock.mockRestore;
    secureSignalProvidersPushMock.mockRestore();
    window.getUid2AdvertisingToken = undefined;
    window.__uid2SecureSignalProvider = undefined;
  });

  describe("when use script without SDK integrated", () => {
    window.__uid2 = undefined;

    describe("when getUid2AdvertisingToken exists and returns valid advertisingToken", () => {
      test("should send signal to Google ESP", async () => {
        window.getUid2AdvertisingToken = getAdvertisingTokenMock;
        getAdvertisingTokenMock.mockReturnValue(Promise.resolve("testToken"));
        uid2ESP = new Uid2SecureSignalProvider();
        expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
        await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "uidapi.com",
          })
        );
        expect(await secureSignalProvidersPushMock.mock.results[0].value).toBe(
          "testToken"
        );
      });
    });

    describe("when getUid2AdvertisingToken is not defined", () => {
      test("should not send signal to ESP", () => {
        uid2ESP = new Uid2SecureSignalProvider();
        expect(secureSignalProvidersPushMock).not.toBeCalled();
      });

      describe("when publisher trigger registerSecureSignalProvider", () => {
        test("should log warning message to console and not send message", () => {
          uid2ESP.registerSecureSignalProvider();
          expect(console.warn).toHaveBeenCalledTimes(1);
          expect(consoleWarnMock).toHaveBeenCalledWith(
            "Uid2SecureSignal: Please implement `getUid2AdvertisingToken`"
          );
          expect(secureSignalProvidersPushMock).not.toBeCalled();
        });
      });
    });

    describe("when getUid2AdvertisingToken exists and returns invalid token", () => {
      test("should not send signal to ESP", () => {
        getAdvertisingTokenMock.mockReturnValue(Promise.resolve(""));
        new Uid2SecureSignalProvider();
        expect(secureSignalProvidersPushMock).not.toBeCalled();
      });
    });
  });

  describe("when use script with SDK", () => {
    const refreshFrom = Date.now() + 1000;
    const identity = mocks.makeIdentityV2({ refresh_from: refreshFrom });
    const refreshedIdentity = mocks.makeIdentityV2({
      advertising_token: "refreshed_token",
    });
    let uid2: UID2;

    beforeEach(() => {
      window.__uid2SecureSignalProvider = undefined;
      window.__uid2 = undefined;
    });

    describe("When script loaded before SDK loaded", () => {
      beforeEach(() => {
        new mocks.CryptoMock(window);
        mocks.setCookieMock(window.document);
        xhrMock = new mocks.XhrMock(window);
        jest.clearAllMocks();
        mocks.resetFakeTime();
        jest.runOnlyPendingTimers();
      });

      afterEach(() => {
        mocks.resetFakeTime();
      });

      test("should send signal to Google ESP when SDK initialized", async () => {
        __uid2SSProviderScriptLoad();
        __uid2InternalHandleScriptLoad();
        (window.__uid2 as UID2).init({ identity });
        expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
        await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "uidapi.com",
          })
        );
        await mocks.flushPromises();
        expect(await secureSignalProvidersPushMock.mock.results[0].value).toBe(
          identity.advertising_token
        );
      });
    });

    describe("When script loaded after SDK loaded", () => {
      beforeEach(() => {
        uid2 = new UID2();
        window.__uid2 = uid2;
        new mocks.CryptoMock(window);
        mocks.setCookieMock(window.document);
        xhrMock = new mocks.XhrMock(window);
        jest.clearAllMocks();
        mocks.resetFakeTime();
        jest.runOnlyPendingTimers();
      });

      afterEach(() => {
        mocks.resetFakeTime();
        window.__uid2SecureSignalProvider = undefined;
      });

      test("should send signal to Google ESP once loaded", async () => {
        uid2.init({ identity });
        window.__uid2SecureSignalProvider = new Uid2SecureSignalProvider();
        UID2.setupGoogleSecureSignals();
        expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
        await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "uidapi.com",
          })
        );
        await mocks.flushPromises();
        expect(await secureSignalProvidersPushMock.mock.results[0].value).toBe(
          identity.advertising_token
        );
      });

      test("should wait for refresh if current identity is outdated", async () => {
        const outdatedIdentity = mocks.makeIdentityV2({
          refresh_from: Date.now() - 1,
        });
        uid2.init({ identity: outdatedIdentity });
        window.__uid2SecureSignalProvider = new Uid2SecureSignalProvider();
        expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(0);
      });

      test("should send signal with updated identity to Google ESP", async () => {
        const outdatedIdentity = mocks.makeIdentityV2({
          refresh_from: Date.now() - 1,
        });
        uid2.init({ identity: outdatedIdentity });
        window.__uid2SecureSignalProvider = new Uid2SecureSignalProvider();
        UID2.setupGoogleSecureSignals();
        jest.setSystemTime(refreshFrom);
        jest.runOnlyPendingTimers();
        expect(xhrMock.send).toHaveBeenCalledTimes(1);
        xhrMock.sendRefreshApiResponse(refreshedIdentity);
        await expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);

        await mocks.flushPromises();
        await mocks.flushPromises();
        expect(await secureSignalProvidersPushMock.mock.results[0].value).toBe(
          refreshedIdentity.advertising_token
        );
      });
    });

    describe("When SDK initialized after both SDK and SS script loaded", () => {
      test("should send identity to Google ESP", async () => {
        __uid2InternalHandleScriptLoad();
        __uid2SSProviderScriptLoad();
        (window.__uid2 as UID2).init({ identity });

        expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
        await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "uidapi.com",
          })
        );
        await mocks.flushPromises();
        expect(await secureSignalProvidersPushMock.mock.results[0].value).toBe(
          identity.advertising_token
        );
      });
    });
  });

  describe("getUid2AdvertisingTokenWithRetry", () => {
    test("should resolve with the result of the promise if it is successful", async () => {
      const mockPromise = jest.fn(() => Promise.resolve("hello"));
      const result = await getUid2AdvertisingTokenWithRetry(mockPromise);

      expect(result).toEqual("hello");
      expect(mockPromise).toHaveBeenCalledTimes(1);
    });

    test("should retry the request and resolve if the promise is successful", async () => {
      const mockPromise = jest.fn();
      mockPromise
        .mockReturnValueOnce(Promise.reject(new Error("Oops")))
        .mockReturnValueOnce(Promise.resolve("hello"));
      const result = await getUid2AdvertisingTokenWithRetry(mockPromise);

      expect(result).toEqual("hello");
      expect(mockPromise).toHaveBeenCalledTimes(2);
    });

    test("should reject with the error if the promise is not successful after all retries", async () => {
      const mockPromise = jest.fn(() => Promise.reject(new Error("Oops!")));

      try {
        await getUid2AdvertisingTokenWithRetry(mockPromise, 5);
      } catch (error) {
        expect(error).toEqual(new Error("Oops!"));
      }
      expect(mockPromise).toHaveBeenCalledTimes(5);
    });
  });
});
