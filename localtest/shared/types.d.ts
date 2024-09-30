import type { UID2, SDKSetup, CallbackHandler } from '../../src/uid2Sdk';

declare global {
  interface Window {
    __uid2: UID2 | SDKSetup | undefined;
  }
}
