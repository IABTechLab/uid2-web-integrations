import { EventType, CallbackHandler } from './callbackManager';
import { CallbackContainer, UIDHelper, sdkAssertErrorText, SdkBase, SDKSetup } from './sdkBase';
import { ProductDetails } from './product';
import { UidSecureSignalProviderType } from './secureSignal_types';
import { loadConfig } from './configManager';

export * from './exports';

const productDetails: ProductDetails = {
  name: 'EUID',
  defaultBaseUrl: 'https://prod.euid.eu',
  localStorageKey: 'EUID-sdk-identity',
  cookieName: '__euid',
};

export class EUID extends SdkBase {
  private static get EuidDetails(): ProductDetails {
    return productDetails;
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
    __euidHelper: UIDHelper | undefined;
    __euidSecureSignalProvider?: UidSecureSignalProviderType;
  }
}
export function assertEUID(sdk: typeof window.__euid): asserts sdk is EUID {
  if (!(sdk instanceof EUID)) throw new Error(sdkAssertErrorText('EUID', 'assertEUID'));
}

function bootstrapInit() {
  if (window.__euid instanceof EUID) {
    const config = loadConfig(productDetails);
    if (config) {
      window.__euid.init(config);
    }
  }
}

export function __euidInternalHandleScriptLoad() {
  if (window.__euid && 'init' in window.__euid) {
    // This has already been run
    return;
  }

  const callbacks = window?.__euid?.callbacks || [];
  const callbackContainer: CallbackContainer = {};
  window.__euid = new EUID(callbacks, callbackContainer);
  window.__euidHelper = new UIDHelper();
  if (callbackContainer.callback) callbackContainer.callback();
  bootstrapInit();
}
__euidInternalHandleScriptLoad();

export const sdkWindow = globalThis.window;
