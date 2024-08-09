import { Logger } from './sdk/logger';

export type InitCallbackPayload = {
  advertisingToken?: string;
  advertising_token?: string;
  status: IdentityStatus;
  statusText: string;
};
export type InitCallbackFunction = (_: InitCallbackPayload) => void;
export type InitCallbackOptions = {
  callback?: InitCallbackFunction;
};

export enum IdentityStatus {
  ESTABLISHED = 0,
  REFRESHED = 1,
  EXPIRED = 100,
  NO_IDENTITY = -1,
  INVALID = -2,
  REFRESH_EXPIRED = -3,
  OPTOUT = -4,
}

export class InitCallbackManager {
  private _callbacks: InitCallbackFunction[];

  constructor(opts: InitCallbackOptions) {
    this._callbacks = opts.callback ? [opts.callback] : [];
  }

  public addCallback(callback: InitCallbackFunction) {
    this._callbacks.push(callback);
  }

  public notifyInitCallbacks(
    status: IdentityStatus,
    statusText: string,
    advertisingToken: string | undefined,
    logger: Logger
  ) {
    this._callbacks.forEach((callback) => {
      const payload = {
        advertisingToken: advertisingToken,
        advertising_token: advertisingToken,
        status: status,
        statusText: statusText,
      };
      try {
        callback(payload);
      } catch (exception) {
        logger.warn('SDK init callback threw an exception', exception);
      }
    });
  }
}
