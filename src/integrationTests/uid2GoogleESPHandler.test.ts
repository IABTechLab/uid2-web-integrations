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
    beforeEach,
    describe,
    expect,
    jest,
    test,
  } from "@jest/globals";
  
  import { UID2EncryptedSignalProvider } from "../uid2Esp";
  import { sdkWindow, UID2 } from "../uid2Sdk";
  
  let uid2: UID2;
  let sendSignalMock: jest.Mock;
    
  beforeEach(() => {
    uid2 = new UID2();
    sdkWindow.__uid2Esp = new UID2EncryptedSignalProvider();
    sendSignalMock = jest.fn();
  });
  
  describe("when initialize UID2 with enableESP set to true", () => {
    it("should not fail if uid2ESP script has not loaded", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      sdkWindow.__uid2Esp = null;
      expect(() => uid2.init({ enableESP: true })).not.toThrow(TypeError);
    });
  
    it("should register callback for google ESP and call sendSignal in uid2ESP script", () => {
      sdkWindow.__uid2Esp.sendSignal = sendSignalMock;
      uid2.init({ enableESP: true });
      expect(sendSignalMock).toBeCalledTimes(1);
    });
  });
  
  describe("When google tag setup is called", () => {
    beforeEach(() => {
      sdkWindow.__uid2 = uid2
    });

    it("should not fail if uid2ESP script has not loaded", () => {
      uid2.init({});
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      sdkWindow.__uid2Esp = null;
      expect(() => UID2.setupGoogleTag()).not.toThrow(TypeError);
    });
  
    test("should push identity if uid2ESP script is loaded", () => {
      uid2.init({});
      sdkWindow.__uid2Esp.sendSignal = sendSignalMock;
      UID2.setupGoogleTag();
      expect(sendSignalMock).toBeCalledTimes(1);
    });
  
    test("should only register callback once if uid2 initialized with esp", () => {
      sdkWindow.__uid2Esp.sendSignal = sendSignalMock;
      uid2.init({ enableESP: true });
      expect(sendSignalMock).toBeCalledTimes(1);
      UID2.setupGoogleTag();
      expect(sendSignalMock).toBeCalledTimes(1);
    });
  });
  