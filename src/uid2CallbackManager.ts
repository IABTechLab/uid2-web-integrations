import { UID2 } from './uid2Sdk';
import { Uid2Identity } from './Uid2Identity';

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
  private _uid2: UID2;
  constructor(uid2: UID2, getIdentity: () => Uid2Identity | null | undefined) {
    this._getIdentity = getIdentity;
    this._uid2 = uid2;
    this._uid2.callbacks.push = this.callbackPushInterceptor.bind(this);
  }

  private static _sentSdkLoaded = false;
  private _sentInit = false;
  private callbackPushInterceptor(...args: Uid2CallbackHandler[]) {
    for (const c of args) {
      if (Uid2CallbackManager._sentSdkLoaded) this.safeRunCallback(c, EventType.SdkLoaded, {});
      if (this._sentInit)
        this.safeRunCallback(c, EventType.InitCompleted, {
          identity: this._getIdentity() ?? null,
        });
    }
    return Array.prototype.push.apply(this._uid2.callbacks, args);
  }

  public runCallbacks(event: EventType, payload: Uid2CallbackPayload) {
    if (event === EventType.InitCompleted) this._sentInit = true;
    if (event === EventType.SdkLoaded) Uid2CallbackManager._sentSdkLoaded = true;
    if (!this._sentInit && event !== EventType.SdkLoaded) return;

    const enrichedPayload = {
      ...payload,
      identity: this._getIdentity() ?? null,
    };
    for (const callback of this._uid2.callbacks) {
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
        console.warn('UID2 callback threw an exception', exception);
      }
    } else {
      console.warn("A UID2 SDK callback was supplied which isn't a function.");
    }
  }
}
