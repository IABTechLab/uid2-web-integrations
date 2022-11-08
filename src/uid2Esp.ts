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

export class UID2EncryptedSignalProvider {
  constructor() {
    if (typeof window.getAdvertisingToken === "function") {
      this.sendSignal();
    }
  }

  public sendSignal = () => {
    const uid2Handler = this.retrieveAdvertisingTokenHandler();

    if (!uid2Handler) {
      console.warn("Please implement `getAdvertisingToken`");
      return;
    }

    if (uid2Handler()) {
      window.googletag = window.googletag || {
        cmd: [],
      };
      window.googletag.encryptedSignalProviders =
        window.googletag.encryptedSignalProviders || [];
      window.googletag.encryptedSignalProviders.push({
        id: "uidapi.com",
        collectorFunction: () => Promise.resolve(uid2Handler()),
      });
    }
  }

  private isUID2SDKIntegrated = (): boolean => {
    return !!(window.__uid2 && "getAdvertisingToken" in window.__uid2);
  }

  private retrieveAdvertisingTokenHandler = (): Function | undefined => {
    if (typeof window.getAdvertisingToken === "function") {
      return window.getAdvertisingToken!;
    }
    if (this.isUID2SDKIntegrated()) {
      return window.__uid2!.getAdvertisingToken!.bind(window.__uid2);
    }
  }
}

declare global {
  interface Window {
    __uid2?: {
      getAdvertisingToken: () => string;
    };
    __uid2Esp: UID2EncryptedSignalProvider;
    getAdvertisingToken?: () => string;
  }
}

(function () {
  window.__uid2Esp = new UID2EncryptedSignalProvider();
})();
