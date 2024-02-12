import { EventType, Uid2CallbackHandler } from './uid2CallbackManager';
import { CallbackContainer, ProductDetails, UID2SdkBase, UID2Setup } from './uid2Sdk';

export class EUID extends UID2SdkBase {
  // Deprecated. Integrators should never access the cookie directly!
  static get COOKIE_NAME() {
    return '__euid';
  }
  private static get Uid2Details(): ProductDetails {
    return {
      name: 'EUID',
      defaultBaseUrl: 'https://prod.euid.eu',
      localStorageKey: 'EUID-sdk-identity',
      cookieName: '__euid',
    };
  }

  constructor(
    existingCallbacks: Uid2CallbackHandler[] | undefined = undefined,
    callbackContainer: CallbackContainer = {}
  ) {
    super(existingCallbacks, EUID.Uid2Details);
    const runCallbacks = () => {
      this._callbackManager.runCallbacks(EventType.SdkLoaded, {});
    };
    if (window.__euid instanceof EUID) {
      runCallbacks();
    } else {
      // Need to defer running callbacks until this is assigned to the window global
      callbackContainer.callback = runCallbacks;
    }
  }
}

declare global {
  interface Window {
    __euid: EUID | UID2Setup | undefined;
  }
}

export function __euidInternalHandleScriptLoad() {
  const callbacks = window?.__euid?.callbacks || [];
  const callbackContainer: CallbackContainer = {};
  window.__euid = new EUID(callbacks, callbackContainer);
  if (callbackContainer.callback) callbackContainer.callback();
}
__euidInternalHandleScriptLoad();

export const sdkWindow = globalThis.window;
