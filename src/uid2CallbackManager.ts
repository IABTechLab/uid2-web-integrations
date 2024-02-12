import { UID2SdkBase } from './uid2Sdk';
import { Uid2Identity } from './Uid2Identity';
import { Logger } from './sdk/logger';

export enum EventType {
  InitCompleted = 'InitCompleted',
  IdentityUpdated = 'IdentityUpdated',
  SdkLoaded = 'SdkLoaded',
}

export type Uid2CallbackPayload = SdkLoadedPayload | PayloadWithIdentity;

export type Uid2CallbackHandler = (event: EventType, payload: Uid2CallbackPayload) => void;
type SdkLoadedPayload = Record<string, never>;
type PayloadWithIdentity = {
  identity: Uid2Identity | null;
};

export class Uid2CallbackManager {
  private _getIdentity: () => Uid2Identity | null | undefined;
  private _logger: Logger;
  private _sdk: UID2SdkBase;
  private _productName: string;
  constructor(
    sdk: UID2SdkBase,
    productName: string,
    getIdentity: () => Uid2Identity | null | undefined,
    logger: Logger
  ) {
    this._productName = productName;
    this._logger = logger;
    this._getIdentity = getIdentity;
    this._sdk = sdk;
    this._sdk.callbacks.push = this.callbackPushInterceptor.bind(this);
  }

  private static _sentSdkLoaded: Record<string, boolean> = {}; //TODO: This needs to be fixed for EUID!
  private _sentInit = false;
  private callbackPushInterceptor(...args: Uid2CallbackHandler[]) {
    for (const c of args) {
      if (Uid2CallbackManager._sentSdkLoaded[this._productName])
        this.safeRunCallback(c, EventType.SdkLoaded, {});
      if (this._sentInit)
        this.safeRunCallback(c, EventType.InitCompleted, {
          identity: this._getIdentity() ?? null,
        });
    }
    return Array.prototype.push.apply(this._sdk.callbacks, args);
  }

  public runCallbacks(event: EventType, payload: Uid2CallbackPayload) {
    if (event === EventType.InitCompleted) this._sentInit = true;
    if (event === EventType.SdkLoaded) Uid2CallbackManager._sentSdkLoaded[this._productName] = true;
    if (!this._sentInit && event !== EventType.SdkLoaded) return;

    const enrichedPayload = {
      ...payload,
      identity: this._getIdentity() ?? null,
    };
    for (const callback of this._sdk.callbacks) {
      this.safeRunCallback(callback, event, enrichedPayload);
    }
  }
  private safeRunCallback(
    callback: Uid2CallbackHandler,
    event: EventType,
    payload: Uid2CallbackPayload
  ) {
    if (typeof callback === 'function') {
      try {
        callback(event, payload);
      } catch (exception) {
        this._logger.warn('SDK callback threw an exception', exception);
      }
    } else {
      this._logger.warn("An SDK callback was supplied which isn't a function.");
    }
  }
}
