import { EventType, Uid2CallbackHandler } from './uid2CallbackManager';
import {
  ClientSideIdentityOptions,
  isClientSideIdentityOptionsOrThrow,
} from './uid2ClientSideIdentityOptions';
import { isNormalizedPhone } from './uid2DiiNormalization';
import { isBase64Hash } from './uid2HashedDii';
import { hashAndEncodeIdentifier } from './encoding/hash';
import { CallbackContainer, ProductDetails, UID2SdkBase, UID2Setup } from './sdkBase';

export * from './exports';

export class UID2 extends UID2SdkBase {
  private static cookieName = '__uid_2';
  // Deprecated. Integrators should never access the cookie directly!
  static get COOKIE_NAME() {
    console.warn(
      'Detected access to UID2.COOKIE_NAME. This is deprecated and will be removed in the future. Integrators should not access the cookie directly.'
    );
    return UID2.cookieName;
  }
  private static get Uid2Details(): ProductDetails {
    return {
      name: 'UID2',
      defaultBaseUrl: 'https://prod.uidapi.com',
      localStorageKey: 'UID2-sdk-identity',
      cookieName: UID2.cookieName,
    };
  }

  static setupGoogleTag() {
    UID2.setupGoogleSecureSignals();
  }

  static setupGoogleSecureSignals() {
    if (window.__uid2SecureSignalProvider)
      window.__uid2SecureSignalProvider.registerSecureSignalProvider();
  }

  constructor(
    existingCallbacks: Uid2CallbackHandler[] | undefined = undefined,
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
    isClientSideIdentityOptionsOrThrow(opts);

    if (!isNormalizedPhone(phone)) {
      throw new Error('Invalid phone number');
    }

    const phoneHash = await hashAndEncodeIdentifier(phone);
    await this.callCstgAndSetIdentity({ phoneHash: phoneHash }, opts);
  }

  public async setIdentityFromPhoneHash(phoneHash: string, opts: ClientSideIdentityOptions) {
    this.throwIfInitNotComplete('Cannot set identity before calling init.');
    isClientSideIdentityOptionsOrThrow(opts);

    if (!isBase64Hash(phoneHash)) {
      throw new Error('Invalid hash');
    }

    await this.callCstgAndSetIdentity({ phoneHash: phoneHash }, opts);
  }
}

declare global {
  interface Window {
    __uid2: UID2 | UID2Setup | undefined;
  }
}

export function __uid2InternalHandleScriptLoad() {
  const callbacks = window?.__uid2?.callbacks || [];
  const callbackContainer: CallbackContainer = {};
  window.__uid2 = new UID2(callbacks, callbackContainer);
  if (callbackContainer.callback) callbackContainer.callback();
}
__uid2InternalHandleScriptLoad();

export const sdkWindow = globalThis.window;
