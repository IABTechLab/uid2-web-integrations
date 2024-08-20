import { EventType, CallbackHandler } from './callbackManager';
import { CallbackContainer, sdkAssertErrorText, SdkBase, SDKSetup } from './sdkBase';
import { ProductDetails } from './product';

export * from './exports';

export class EUID extends SdkBase {
  private static cookieName = '__euid';
  // Deprecated. Integrators should never access the cookie directly!
  static get COOKIE_NAME() {
    console.warn(
      'Detected access to EUID.COOKIE_NAME. This is deprecated and will be removed in the future. Integrators should not access the cookie directly.'
    );
    return EUID.cookieName;
  }
  private static get EuidDetails(): ProductDetails {
    return {
      name: 'EUID',
      defaultBaseUrl: 'https://prod.euid.eu',
      localStorageKey: 'EUID-sdk-identity',
      cookieName: EUID.cookieName,
    };
  }

  static setupGoogleTag() {
    EUID.setupGoogleSecureSignals();
  }

  static setupGoogleSecureSignals() {
    if (window.__euidSecureSignalProvider)
      window.__euidSecureSignalProvider.registerSecureSignalProvider();
  }

  constructor(
    existingCallbacks: CallbackHandler[] | undefined = undefined,
    callbackContainer: CallbackContainer = {}
  ) {
    super(existingCallbacks, EUID.EuidDetails);
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
    __euid: EUID | SDKSetup | undefined;
  }
}
export function assertEUID(sdk: typeof window.__euid): asserts sdk is EUID {
  if (!(sdk instanceof EUID)) throw new Error(sdkAssertErrorText('EUID', 'assertEUID'));
}

export function __euidInternalHandleScriptLoad() {
  if (window.__euid instanceof EUID) {
    // This has already been run
    return;
  }

  const callbacks = window?.__euid?.callbacks || [];
  const callbackContainer: CallbackContainer = {};
  window.__euid = new EUID(callbacks, callbackContainer);
  if (callbackContainer.callback) callbackContainer.callback();
}
__euidInternalHandleScriptLoad();

export const sdkWindow = globalThis.window;
