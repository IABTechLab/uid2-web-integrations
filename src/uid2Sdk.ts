import { EventType, CallbackHandler } from './callbackManager';
import {
  ClientSideIdentityOptions,
  isClientSideIdentityOptionsOrThrow,
} from './clientSideIdentityOptions';
import { isNormalizedPhone, normalizeEmail } from './diiNormalization';
import { isBase64Hash } from './hashedDii';
import { hashAndEncodeIdentifier, hashIdentifier } from './encoding/hash';
import { CallbackContainer, sdkAssertErrorText, SdkBase, SDKSetup } from './sdkBase';
import { ProductDetails } from './product';
import { loadConfig } from './configManager';
import { UidSecureSignalProviderType } from './secureSignal_types';

export * from './exports';

export class UID2Helper {
  public normalizeEmail(email: string) {
    return normalizeEmail(email);
  }

  public hashIdentifier(normalizedEmail: string) {
    return hashIdentifier(normalizedEmail);
  }

  public async hashAndEncodeIdentifier(normalizedEmail: string) {
    return await hashAndEncodeIdentifier(normalizedEmail);
  }

  public isNormalizedPhone(phone: string) {
    return isNormalizedPhone(phone);
  }
}

const productDetails: ProductDetails = {
  name: 'UID2',
  defaultBaseUrl: 'https://prod.uidapi.com',
  localStorageKey: 'UID2-sdk-identity',
  cookieName: '__uid_2',
};

export class UID2 extends SdkBase {
  private static cookieName = productDetails.cookieName;
  // Deprecated. Integrators should never access the cookie directly!
  static get COOKIE_NAME() {
    console.warn(
      'Detected access to UID2.COOKIE_NAME. This is deprecated and will be removed in the future. Integrators should not access the cookie directly.'
    );
    return UID2.cookieName;
  }
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

  public async setIdentityFromPhone(phone: string, opts: ClientSideIdentityOptions) {
    this.throwIfInitNotComplete('Cannot set identity before calling init.');
    isClientSideIdentityOptionsOrThrow(opts, this._product.name);

    if (!isNormalizedPhone(phone)) {
      throw new Error('Invalid phone number');
    }

    const phoneHash = await hashAndEncodeIdentifier(phone);
    await this.callCstgAndSetIdentity({ phoneHash: phoneHash }, opts);
  }

  public async setIdentityFromPhoneHash(phoneHash: string, opts: ClientSideIdentityOptions) {
    this.throwIfInitNotComplete('Cannot set identity before calling init.');
    isClientSideIdentityOptionsOrThrow(opts, this._product.name);

    if (!isBase64Hash(phoneHash)) {
      throw new Error('Invalid hash');
    }

    await this.callCstgAndSetIdentity({ phoneHash: phoneHash }, opts);
  }
}

declare global {
  interface Window {
    __uid2: UID2 | SDKSetup | undefined;
    __uid2Helper: UID2Helper | undefined;
    __uid2SecureSignalProvider?: UidSecureSignalProviderType;
  }
}

export function assertUID2(sdk: typeof window.__uid2): asserts sdk is UID2 {
  if (!(sdk instanceof UID2)) throw new Error(sdkAssertErrorText('UID2', 'assertUID2'));
}

export function __uid2InternalHandleScriptLoad() {
  if (window.__uid2 && 'init' in window.__uid2) {
    // This has already been run
    return;
  }

  const callbacks = window?.__uid2?.callbacks || [];
  const callbackContainer: CallbackContainer = {};
  window.__uid2 = new UID2(callbacks, callbackContainer);
  window.__uid2Helper = new UID2Helper();
  if (callbackContainer.callback) callbackContainer.callback();
  if (window.__uid2 instanceof UID2) {
    const config = loadConfig(productDetails);
    if (config) {
      window.__uid2.init(config);
    }
  }
}
__uid2InternalHandleScriptLoad();

export const sdkWindow = globalThis.window;
