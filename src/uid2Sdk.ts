import { EventType, CallbackHandler } from './callbackManager';
import { CallbackContainer, UIDHelper, sdkAssertErrorText, SdkBase, SDKSetup } from './sdkBase';
import { ProductDetails } from './product';
import { loadConfig } from './configManager';
import { UidSecureSignalProviderType } from './secureSignal_types';

export * from './exports';

const productDetails: ProductDetails = {
  name: 'UID2',
  defaultBaseUrl: 'https://prod.uidapi.com',
  localStorageKey: 'UID2-sdk-identity',
  cookieName: '__uid_2',
};

export class UID2 extends SdkBase {
  private static get Uid2Details(): ProductDetails {
    return productDetails;
  }

  static setupGoogleTag() {
    UID2.setupGoogleSecureSignals();
  }

  static setupGoogleSecureSignals() {
    if (window.__uid2SecureSignalProvider)
      window.__uid2SecureSignalProvider.registerSecureSignalProvider();
  }

  constructor(
    existingCallbacks: CallbackHandler[] | undefined = undefined,
    callbackContainer: CallbackContainer = {}
  ) {
    super(existingCallbacks, UID2.Uid2Details);
    const runCallbacks = () => {
      this._callbackManager.runCallbacks(EventType.SdkLoaded, {});
    };
    if (window.__uid2 instanceof UID2) {
      runCallbacks();
    } else {
      // Need to defer running callbacks until this is assigned to the window global
      callbackContainer.callback = runCallbacks;
    }
  }
}

declare global {
  interface Window {
    __uid2: UID2 | SDKSetup | undefined;
    __uid2Helper: UIDHelper | undefined;
    __uid2SecureSignalProvider?: UidSecureSignalProviderType;
  }
}

export function assertUID2(sdk: typeof window.__uid2): asserts sdk is UID2 {
  if (!(sdk instanceof UID2)) throw new Error(sdkAssertErrorText('UID2', 'assertUID2'));
}

function bootstrapInit() {
  if (window.__uid2 instanceof UID2) {
    const config = loadConfig(productDetails);
    if (config) {
      window.__uid2.init(config);
    }
  }
}

export function __uid2InternalHandleScriptLoad() {
  if (window.__uid2 && 'init' in window.__uid2) {
    // This has already been run
    return;
  }

  const callbacks = window?.__uid2?.callbacks || [];
  const callbackContainer: CallbackContainer = {};
  window.__uid2 = new UID2(callbacks, callbackContainer);
  window.__uid2Helper = new UIDHelper();
  if (callbackContainer.callback) callbackContainer.callback();
  bootstrapInit();
}
__uid2InternalHandleScriptLoad();

export const sdkWindow = globalThis.window;
