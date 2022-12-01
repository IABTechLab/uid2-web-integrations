// Copyright (c) 2021 The Trade Desk, Inc
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice,
//    this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import * as mocks from "../mocks";
import { EncryptedSignalProvider, MockedGoogleTag } from "../mockedGoogleTag";
import {
  Uid2SecureSignalProvider,
  __uid2SSProviderScriptLoad,
} from "../uid2SecureSignal";
import { UID2, __uid2InternalHandleScriptLoad } from "../uid2Sdk";

let consoleWarnMock: any;
let getAdvertisingTokenMock: jest.Mock<() => Promise<string>>;
let secureSignalProvidersPushMock: jest.Mock<
  (p: EncryptedSignalProvider) => Promise<void>
>;
let secureSignalProvidersResolveMock: jest.Mock<(token: string) => void>;
let uid2ESP: Uid2SecureSignalProvider;
let xhrMock: any;
mocks.setupFakeTime();

beforeEach(() => {
  getAdvertisingTokenMock = jest.fn<() => Promise<string>>();
  secureSignalProvidersResolveMock = jest.fn();
  secureSignalProvidersPushMock = jest.fn(
    async (p: EncryptedSignalProvider) => {
      secureSignalProvidersResolveMock(await p.collectorFunction());
    }
  );
  window.googletag = new MockedGoogleTag();
  window.googletag.secureSignalProviders.push = secureSignalProvidersPushMock;
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
      //@ts-ignore
      expect(await uid2ESP.retrieveAdvertisingTokenHandler()!()).toBe(
        "testToken"
      );
      expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
      await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "uidapi.com",
        })
      );
      expect(secureSignalProvidersResolveMock).toHaveBeenCalledWith(
        "testToken"
      );
    });
  });

  describe("when getUid2AdvertisingToken is not definied", () => {
    test("should not send signal to ESP", () => {
      uid2ESP = new Uid2SecureSignalProvider();
      expect(secureSignalProvidersPushMock).not.toBeCalled();
    });

    describe("when publisher trigger registerSecureSignalProvider", () => {
      test("should log warning message to console and not send message", () => {
        uid2ESP.registerSecureSignalProvider();
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(consoleWarnMock).toHaveBeenCalledWith(
          "Please implement `getUid2AdvertisingToken`"
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
    test("should send signal to Google ESP when SDK initialized", async () => {
      __uid2SSProviderScriptLoad();
      __uid2InternalHandleScriptLoad();
      (window.__uid2 as UID2).init({ identity });

      expect(
        //@ts-ignore
        await window.__uid2SecureSignalProvider.retrieveAdvertisingTokenHandler()!()
      ).toBe(identity.advertising_token);
      expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
      await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "uidapi.com",
        })
      );
      expect(secureSignalProvidersResolveMock).toHaveBeenCalledWith(
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
      uid2.setupGoogleSecureSignals();
      expect(
        //@ts-ignore
        await window.__uid2SecureSignalProvider.retrieveAdvertisingTokenHandler()!()
      ).toBe(identity.advertising_token);
      expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
      await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "uidapi.com",
        })
      );
      expect(secureSignalProvidersResolveMock).toHaveBeenCalledWith(
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
      uid2.setupGoogleSecureSignals();
      await expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(0);
      jest.setSystemTime(refreshFrom);
      jest.runOnlyPendingTimers();
      expect(xhrMock.send).toHaveBeenCalledTimes(1);
      xhrMock.sendRefreshApiResponse(refreshedIdentity);
      await mocks.flushPromises();

      expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
      expect(secureSignalProvidersResolveMock).toHaveBeenCalledWith(
        refreshedIdentity.advertising_token
      );
    });
  });

  describe("When SDK initialized after both SDK and SS script loaded", () => {
    test("should send identity to Google ESP", async () => {
      __uid2InternalHandleScriptLoad();
      __uid2SSProviderScriptLoad();

      await mocks.flushPromises();
      (window.__uid2 as UID2).init({ identity });

      expect(
        //@ts-ignore
        await window.__uid2SecureSignalProvider.retrieveAdvertisingTokenHandler()!()
      ).toBe(identity.advertising_token);
      expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
      await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "uidapi.com",
        })
      );
      expect(secureSignalProvidersResolveMock).toHaveBeenCalledWith(
        identity.advertising_token
      );
    });
  });
});
