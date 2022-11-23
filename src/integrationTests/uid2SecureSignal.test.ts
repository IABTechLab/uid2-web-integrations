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
import * as mocks from '../mocks';
import { EncryptedSignalProvider, MockedGoogleTag } from "../mockedGoogleTag";
import { Uid2SecureSignalProvider } from '../uid2SecureSignal'
import { sdkWindow, UID2 } from "../uid2Sdk";

let consoleWarnMock: any;
let getAdvertisingTokenMock: jest.Mock<() => string>;
let secureSignalProvidersPushMock: jest.Mock<
  (p: EncryptedSignalProvider) => Promise<void>
>;
let secureSignalProvidersResolveMock: jest.Mock<(token: string) => void>
let uid2ESP: Uid2SecureSignalProvider;
let xhrMock: any;
mocks.setupFakeTime();

beforeEach(() => {
  getAdvertisingTokenMock = jest.fn<() => string>();
  secureSignalProvidersResolveMock = jest.fn();
  secureSignalProvidersPushMock = jest.fn(async (p: EncryptedSignalProvider) => {
    secureSignalProvidersResolveMock(await p.collectorFunction())
  })
  window.googletag = new MockedGoogleTag();
  window.googletag.secureSignalProviders.push =
    secureSignalProvidersPushMock;
  consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {
    return;
  });
});

afterEach(() => {
  consoleWarnMock.mockRestore();
  getAdvertisingTokenMock.mockRestore;
  secureSignalProvidersPushMock.mockRestore();
  window.getUid2AdvertisingToken = undefined;
});

describe("when use script without SDK integrated", () => {
  describe("when getUid2AdvertisingToken exists and returns valid advertisingToken", () => {
    test("should send signal to Google ESP", async () => {
      window.getUid2AdvertisingToken = getAdvertisingTokenMock;
      getAdvertisingTokenMock.mockReturnValue("testToken");
      uid2ESP = new Uid2SecureSignalProvider();
      //@ts-ignore
      expect(uid2ESP.retrieveAdvertisingTokenHandler()!()).toBe("testToken");
      expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
      await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "uidapi.com",
        })
      );
      expect(secureSignalProvidersResolveMock).toHaveBeenCalledWith("testToken")
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
      getAdvertisingTokenMock.mockReturnValue("");
      new Uid2SecureSignalProvider();
      expect(secureSignalProvidersPushMock).not.toBeCalled();
    });
  });
});

describe("when use script with SDK", () => {
  const refreshFrom = Date.now() + 100;
  const identity = mocks.makeIdentityV2({ refresh_from: refreshFrom });
  const refreshedIdentity = mocks.makeIdentityV2({ advertising_token: 'refreshed_token' })
  let uid2: UID2;
  beforeEach(() => {
    uid2ESP = new Uid2SecureSignalProvider();
    uid2 = new UID2();
    window.__uid2 = uid2
  })

  afterEach(() => {
    //@ts-ignore
    window.__uid2Esp = undefined
  })
        
  describe("when SDK enable esp with identity", () => {
    describe("When script loaded before SDK loaded", () => {
      test("should send signal to Google ESP when SDK initialized", async () => {
        uid2.init({ identity, enableSecureSignals: true });
        //@ts-ignore
        expect(uid2ESP.retrieveAdvertisingTokenHandler()!()).toBe(identity.advertising_token);
        expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
        await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "uidapi.com",
          })
        );
        expect(secureSignalProvidersResolveMock).toHaveBeenCalledWith(identity.advertising_token)
      })
    });

    describe("When script loaded after SDK loaded", () => {
      test("should send signal to Google ESP once loaded", async () => {
        //@ts-ignore
        uid2.init({ identity, enableSecureSignals: true });
        window.__uid2Esp = uid2ESP
        //@ts-ignore
        expect(uid2ESP.retrieveAdvertisingTokenHandler()!()).toBe(identity.advertising_token);
        expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
        await expect(secureSignalProvidersPushMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "uidapi.com",
          })
        );
        expect(secureSignalProvidersResolveMock).toHaveBeenCalledWith(identity.advertising_token)
      })
    });
  })

  describe("when SDK updates the identity", () => {
    beforeEach(() => {
      window.__uid2Esp = uid2ESP
      new mocks.CryptoMock(sdkWindow);
      mocks.setCookieMock(sdkWindow.document);
      xhrMock = new mocks.XhrMock(sdkWindow);
      jest.clearAllMocks();
      mocks.resetFakeTime();
      jest.runOnlyPendingTimers();
    })

    afterEach(() => {
      mocks.resetFakeTime();
    })

    test("should send signal with updated identity to Google ESP", async() => {
      uid2.init({ identity, enableSecureSignals: true });
      await expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(1);
      expect(secureSignalProvidersResolveMock).toHaveBeenCalledWith(identity.advertising_token)
      jest.setSystemTime(refreshFrom);
      jest.runOnlyPendingTimers();
      expect(xhrMock.send).toHaveBeenCalledTimes(1);
      xhrMock.sendRefreshApiResponse(refreshedIdentity);
      await mocks.flushPromises();

      expect(secureSignalProvidersPushMock).toHaveBeenCalledTimes(2);
      expect(secureSignalProvidersResolveMock).toHaveBeenCalledWith(refreshedIdentity.advertising_token)
    })
  })
});