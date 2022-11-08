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
import { EncryptedSignalProvider, MockedGoogleTag } from "../mockedGoogleTag";
import { UID2EncryptedSignalProvider } from "../uid2Esp";

let consoleWarnMock: any;
let getAdvertisingTokenMock: jest.Mock<() => string>;
let encryptedSignalProvidersPushMock: jest.Mock<
  (p: EncryptedSignalProvider) => Promise<void>
>;
let uid2ESP: UID2EncryptedSignalProvider;

beforeEach(() => {
  getAdvertisingTokenMock = jest.fn<() => string>();
  encryptedSignalProvidersPushMock = jest.fn();
  window.getAdvertisingToken = getAdvertisingTokenMock;
  window.googletag = new MockedGoogleTag();
  window.googletag.encryptedSignalProviders.push =
    encryptedSignalProvidersPushMock;
  consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {
    return;
  });
});

afterEach(() => {
  consoleWarnMock.mockRestore();
  getAdvertisingTokenMock.mockRestore;
  encryptedSignalProvidersPushMock.mockRestore();
});

describe("When script loaded", () => {
  describe("when getAdvertisingToken exists and returns valid advertisingToken", () => {
    it("should send signal to ESP", () => {
      getAdvertisingTokenMock.mockReturnValue("testToken");
      uid2ESP = new UID2EncryptedSignalProvider();
      //@ts-ignore
      expect(uid2ESP.retrieveAdvertisingTokenHandler()!()).toBe("testToken");
      expect(encryptedSignalProvidersPushMock).toHaveBeenCalledTimes(1);
      expect(encryptedSignalProvidersPushMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "uidapi.com",
        })
      );
    });
  });

  describe("when getAdvertisingToken is not definied", () => {
    beforeEach(() => {
      window.getAdvertisingToken = undefined;
      uid2ESP = new UID2EncryptedSignalProvider();
    });

    it("should not send signal to ESP", () => {
      expect(encryptedSignalProvidersPushMock).not.toBeCalled();
    });

    describe("when publisher trigger sendSignal", () => {
      it("should log warning message to console and not send message", () => {
        uid2ESP.sendSignal();
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(consoleWarnMock).toHaveBeenCalledWith(
          "Please implement `getAdvertisingToken`"
        );
        expect(encryptedSignalProvidersPushMock).not.toBeCalled();
      });
    });
  });

  describe("when getAdvertisingToken exists and returns invalid token", () => {
    it("should not send signal to ESP", () => {
      getAdvertisingTokenMock.mockReturnValue("");
      new UID2EncryptedSignalProvider();
      expect(encryptedSignalProvidersPushMock).not.toBeCalled();
    });
  });
});
