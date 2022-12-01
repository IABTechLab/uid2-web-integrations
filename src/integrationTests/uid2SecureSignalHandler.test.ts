/* eslint-disable @typescript-eslint/ban-ts-comment */

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

import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import * as mocks from "../mocks";
import {
  Uid2SecureSignalProvider,
  __uid2SSProviderScriptLoad,
} from "../uid2SecureSignal";
import { UID2, __uid2InternalHandleScriptLoad } from "../uid2Sdk";

let uid2: UID2;
let sendSignalMock: jest.Mock;
const identity = mocks.makeIdentityV2({});

beforeEach(() => {
  sendSignalMock = jest.fn();
  // @ts-ignore
  window.__uid2SecureSignalProvider = undefined;
  window.__uid2 = undefined;
});

describe("when initialize UID2 with uid2SecureSignalProvider loaded", () => {
  it("should register callback for google ESP and call registerSecureSignalProvider in uid2SecureSignalProvider", () => {
    __uid2SSProviderScriptLoad();
    window.__uid2SecureSignalProvider!.registerSecureSignalProvider =
      sendSignalMock;
    __uid2InternalHandleScriptLoad();
    (window.__uid2 as UID2).init({ identity });
    expect(sendSignalMock).toBeCalledTimes(1);
  });
});

describe("When google tag setup is called", () => {
  it("should not fail if uid2SecureSignalProvider has not loaded", () => {
    __uid2InternalHandleScriptLoad();
    (window.__uid2 as UID2).init({});
    // @ts-ignore
    expect(() => UID2.setupGoogleTag()).not.toThrow(TypeError);
  });

  it("should push identity if uid2SecureSignalProvider script is loaded", () => {
    __uid2InternalHandleScriptLoad();
    (window.__uid2 as UID2).init({ identity });
    window.__uid2SecureSignalProvider = new Uid2SecureSignalProvider();
    window.__uid2SecureSignalProvider!.registerSecureSignalProvider =
      sendSignalMock;
    (window.__uid2 as UID2).setupGoogleSecureSignals();
    expect(sendSignalMock).toBeCalledTimes(1);
  });

  test("should only register callback once if uid2 initialized with esp", () => {
    __uid2SSProviderScriptLoad();
    window.__uid2SecureSignalProvider!.registerSecureSignalProvider =
      sendSignalMock;
    __uid2InternalHandleScriptLoad();
    (window.__uid2 as UID2).init({ identity });
    expect(sendSignalMock).toBeCalledTimes(1);
    UID2.setupGoogleTag();
    expect(sendSignalMock).toBeCalledTimes(1);
  });
});
/* eslint-enable @typescript-eslint/ban-ts-comment */
