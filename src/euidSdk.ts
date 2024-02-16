import { EventType, Uid2CallbackHandler } from './uid2CallbackManager';
import { CallbackContainer, ProductDetails, UID2SdkBase, UID2Setup } from './sdkBase';

export * from './euidExports';

export class EUID extends UID2SdkBase {
  private static cookieName = '__euid';
  // Deprecated. Integrators should never access the cookie directly!
  static get COOKIE_NAME() {
    console.warn(
      'Detected access to EUID.COOKIE_NAME. This is deprecated and will be removed in the future. Integrators should not access the cookie directly.'
    );
    return EUID.cookieName;
  }
  private static get Uid2Details(): ProductDetails {
    return {
      name: 'EUID',
      defaultBaseUrl: 'https://prod.euid.eu',
      localStorageKey: 'EUID-sdk-identity',
      cookieName: EUID.cookieName,
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
