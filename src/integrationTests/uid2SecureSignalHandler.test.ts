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

/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
    beforeEach,
    describe,
    expect,
    jest,
    test,
  } from "@jest/globals";
  import * as mocks from '../mocks';
  import { Uid2SecureSignalProvider } from "../uid2SecureSignal";
  import { sdkWindow, UID2 } from "../uid2Sdk";
  
  let uid2: UID2;
  let sendSignalMock: jest.Mock;
  let xhrMock: any;
  let identity: any;

  beforeEach(() => {
    jest.clearAllMocks();
    uid2 = new UID2();
    sdkWindow.__uid2Esp = new Uid2SecureSignalProvider();
    sendSignalMock = jest.fn();
    xhrMock = new mocks.XhrMock(sdkWindow);
    identity = mocks.makeIdentityV2();
    new mocks.CryptoMock(sdkWindow);
    mocks.setCookieMock(sdkWindow.document);
  });
  
  describe("when initialize UID2 with enableSecureSignals set to true", () => {
    it("should not fail if uid2ESP script has not loaded", () => {
      // @ts-ignore
      sdkWindow.__uid2Esp = null;
      expect(() => uid2.init({ enableSecureSignals: true })).not.toThrow(TypeError);
    });
  
    it("should register callback for google ESP and force a refresh is secure signal is expired", () => {
      sdkWindow.__uid2Esp.isCacheExpired = jest.fn<() => boolean>().mockReturnValue(true);
      uid2.init({ enableSecureSignals: true, identity });
      expect(xhrMock.send).toHaveBeenCalledTimes(1);
    });
  });
  
  describe("When setupGoogleSecureSignals is called", () => {
    const refreshedIdentity = mocks.makeIdentityV2({ advertising_token: 'refreshed_token' })
    beforeEach(() => {
      sdkWindow.__uid2 = uid2
    });

    it("should not fail if uid2ESP script has not loaded", () => {
      uid2.init({});
      // @ts-ignore
      sdkWindow.__uid2Esp = null;
      expect(() => uid2.setupGoogleSecureSignals()).not.toThrow(TypeError);
    });
  
    test("should push identity if uid2ESP script is loaded", async () => {
      uid2.init({ identity });
      sdkWindow.__uid2Esp.isCacheExpired = jest.fn<() => boolean>().mockReturnValue(true);
      sdkWindow.__uid2Esp.registerSecureSignalProvider = sendSignalMock;
      uid2.setupGoogleSecureSignals();
      xhrMock.sendRefreshApiResponse(refreshedIdentity);
      await mocks.flushPromises();

      expect(sendSignalMock).toHaveBeenCalledTimes(1);
      expect(sendSignalMock).toBeCalledWith(refreshedIdentity.advertising_token);
    });
  
    test("should only register callback once if uid2 initialized with esp", async () => {
      sdkWindow.__uid2Esp.registerSecureSignalProvider = sendSignalMock;
      uid2.init({ enableSecureSignals: true, identity });
      xhrMock.sendRefreshApiResponse(refreshedIdentity);
      await mocks.flushPromises();
      expect(sendSignalMock).toBeCalledTimes(1);
      expect(sendSignalMock).toBeCalledWith(refreshedIdentity.advertising_token);
      uid2.setupGoogleSecureSignals();
      expect(sendSignalMock).toBeCalledTimes(1);
    });
  });
/* eslint-enable @typescript-eslint/ban-ts-comment */
