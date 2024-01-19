import { UID2SdkBase } from './uid2Sdk';
import { EventType, Uid2CallbackPayload } from './uid2CallbackManager';
import { Uid2ApiClient } from './uid2ApiClient';

export type PromiseOutcome<T> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: Error | string) => void;
};

export class UID2PromiseHandler {
  private _promises: PromiseOutcome<string>[] = [];
  private _seenInitOrRejectAll = false;
  private _apiClient?: Uid2ApiClient;
  private _handleEvent(eventType: EventType, payload: Uid2CallbackPayload) {
    if (eventType !== EventType.InitCompleted && eventType !== EventType.IdentityUpdated) return;
    if (eventType === EventType.InitCompleted) {
      this._seenInitOrRejectAll = true;
    }
    if (!this._apiClient || !this._apiClient.hasActiveRequests()) {
      this._promises.forEach((p) => {
        if ('identity' in payload && payload.identity) {
          p.resolve(payload.identity.advertising_token);
        } else {
          p.reject(new Error(`No identity available.`));
        }
      });
      this._promises = [];
    }
  }

  public rejectAllPromises(reason: string | Error) {
    this._seenInitOrRejectAll = true;
    this._promises.forEach((p) => {
      p.reject(reason);
    });
    this._promises = [];
  }
  // n.b. If this has seen an SDK init and there is no active request or a reject-all call, it'll reply immediately with the provided token or rejection.
  // Otherwise, it will ignore the provided token and resolve with the identity available when the init event arrives
  public createMaybeDeferredPromise(token: string | null) {
    if (!this._seenInitOrRejectAll || (this._apiClient && this._apiClient.hasActiveRequests())) {
      return new Promise<string>((resolve, reject) => {
        this._promises.push({
          resolve,
          reject,
        });
      });
    } else {
      if (token) return Promise.resolve(token);
      else return Promise.reject(new Error('Identity not available'));
    }
  }

  public registerApiClient(apiClient: Uid2ApiClient) {
    this._apiClient = apiClient;
  }
  constructor(uid2Sdk: UID2SdkBase) {
    uid2Sdk.callbacks.push(this._handleEvent.bind(this));
  }
}
