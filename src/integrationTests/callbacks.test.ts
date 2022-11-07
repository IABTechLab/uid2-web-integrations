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

import { afterEach,beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks.js';
import { sdkWindow, UID2 } from '../uid2Sdk';
import { Uid2CallbackHandler } from '../uid2CallbackManager';

let callback: any;
let asyncCallback: jest.Mock<Uid2CallbackHandler>;
let uid2: UID2;
let xhrMock: any;

const debugOutput = false;

let _cryptoMock;

mocks.setupFakeTime();

beforeEach(() => {
  jest.clearAllMocks();
  mocks.resetFakeTime();
  jest.runOnlyPendingTimers();

  callback = jest.fn();
  uid2 = new UID2();
  xhrMock = new mocks.XhrMock(sdkWindow);
  _cryptoMock = new mocks.CryptoMock(sdkWindow);
  mocks.setCookieMock(sdkWindow.document);
  sdkWindow.__uid2 = { callbacks: [] };
  asyncCallback = jest.fn((event, payload) => {
    if (debugOutput) {
      console.log("Async Callback Event:", event);
      console.log("Payload:", payload);
    }
  });
});

afterEach(() => {
  mocks.resetFakeTime();
});

const makeIdentity = mocks.makeIdentityV2;

describe("when a callback is provided", () => {
  const refreshFrom = Date.now() + 100;
  const identity = { ...makeIdentity(), refresh_from: refreshFrom };
  const refreshedIdentity = { ...makeIdentity(), advertising_token: 'refreshed_token' };
  describe("before init is called", () => {
    test("it should be called at the end of init", () => {
      uid2.callbacks.push(asyncCallback);
      const calls = asyncCallback.mock.calls.length;
      uid2.init({ callback: callback, identity: identity });
      expect(asyncCallback.mock.calls.length).toBe(calls+1);
    });
    test("it should be called with a 'successful init' message", () => {
      uid2.callbacks.push(asyncCallback);
      uid2.init({ callback: callback, identity: identity });
      expect(asyncCallback.mock.calls.slice(-1)[0][0]).toBe(UID2.EventType.InitCompleted);
    });
    test("it should be provided with the loaded identity", () => {
      uid2.callbacks.push(asyncCallback);
      uid2.init({ callback: callback, identity: identity });
      expect(asyncCallback.mock.calls.slice(-1)[0][1]).toMatchObject({ identity });
    });
  });

  describe("after init is called", () => {
    test("it should be called with SdkLoaded and InitComplete immediately", () => {
      uid2.init({ callback: callback, identity: identity });
      expect(asyncCallback.mock.calls.length).toBe(0);
      uid2.callbacks.push(asyncCallback);
      expect(asyncCallback.mock.calls.length).toBe(2);
      expect(asyncCallback.mock.calls[0][0]).toBe(UID2.EventType.SdkLoaded);
      expect(asyncCallback.mock.calls[1][0]).toBe(UID2.EventType.InitCompleted);
    });

    test("it should be provided with the loaded identity", () => {
      uid2.init({ callback: callback, identity: identity });
      uid2.callbacks.push(asyncCallback);
      
      expect(asyncCallback.mock.calls.slice(-1)[0][1]).toMatchObject({ identity });
    });

    test("it should receive subsequent identity updates", async () => {
      uid2.init({ callback: callback, identity: identity });
      uid2.callbacks.push(asyncCallback);
      
      const callsBeforeRefresh = asyncCallback.mock.calls.length;
      jest.setSystemTime(refreshFrom);
      jest.runOnlyPendingTimers();
      expect(xhrMock.send).toHaveBeenCalledTimes(1);
      xhrMock.sendRefreshApiResponse(refreshedIdentity);
      await mocks.flushPromises();

      expect(asyncCallback.mock.calls.length).toBe(callsBeforeRefresh+1);
      expect(asyncCallback.mock.calls[callsBeforeRefresh][0]).toBe(UID2.EventType.IdentityUpdated);
      expect(asyncCallback.mock.calls[callsBeforeRefresh][1]).toMatchObject({ identity: refreshedIdentity });
    });

    test("it should receive a null identity update if opt-out is called", () => {
      uid2.init({ callback: callback, identity: identity });
      uid2.callbacks.push(asyncCallback);
      const callsBeforeRefresh = asyncCallback.mock.calls.length;

      uid2.disconnect();

      expect(asyncCallback.mock.calls.length).toBe(callsBeforeRefresh+1);
      expect(asyncCallback.mock.calls[callsBeforeRefresh][0]).toBe(UID2.EventType.IdentityUpdated);
      expect(asyncCallback.mock.calls[callsBeforeRefresh][1]).toMatchObject({ identity: null });
    });
  });
});
