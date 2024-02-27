import { SdkBase } from './sdkBase';
import { Identity } from './Identity';
import { Logger } from './sdk/logger';

export enum EventType {
  InitCompleted = 'InitCompleted',
  IdentityUpdated = 'IdentityUpdated',
  SdkLoaded = 'SdkLoaded',
  OptoutReceived = 'OptoutReceived',
}

export type CallbackPayload = SdkLoadedPayload | PayloadWithIdentity;

export type CallbackHandler = (event: EventType, payload: CallbackPayload) => void;
type SdkLoadedPayload = Record<string, never>;
type PayloadWithIdentity = {
  identity: Identity | null;
};

export class CallbackManager {
  private _getIdentity: () => Identity | null | undefined;
  private _logger: Logger;
  private _sdk: SdkBase;
  private _productName: string;
  constructor(
    sdk: SdkBase,
    productName: string,
    getIdentity: () => Identity | null | undefined,
    logger: Logger
  ) {
    this._productName = productName;
    this._logger = logger;
    this._getIdentity = getIdentity;
    this._sdk = sdk;
    this._sdk.callbacks.push = this.callbackPushInterceptor.bind(this);
  }

  private static _sentSdkLoaded: Record<string, boolean> = {};
  private _sentInit = false;
  private callbackPushInterceptor(...args: CallbackHandler[]) {
    for (const c of args) {
      if (CallbackManager._sentSdkLoaded[this._productName])
        this.safeRunCallback(c, EventType.SdkLoaded, {});
      if (this._sentInit)
        this.safeRunCallback(c, EventType.InitCompleted, {
          identity: this._getIdentity() ?? null,
        });
    }
    return Array.prototype.push.apply(this._sdk.callbacks, args);
  }

  public runCallbacks(event: EventType, payload: CallbackPayload) {
    if (event === EventType.InitCompleted) this._sentInit = true;
    if (event === EventType.SdkLoaded) CallbackManager._sentSdkLoaded[this._productName] = true;
    if (!this._sentInit && event !== EventType.SdkLoaded) return;

    const enrichedPayload = {
      ...payload,
      identity: this._getIdentity() ?? null,
    };
    for (const callback of this._sdk.callbacks) {
      this.safeRunCallback(callback, event, enrichedPayload);
    }
  }
  private safeRunCallback(callback: CallbackHandler, event: EventType, payload: CallbackPayload) {
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
