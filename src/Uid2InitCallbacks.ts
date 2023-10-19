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

export function notifyInitCallback(
  options: InitCallbackOptions,
  status: IdentityStatus,
  statusText: string,
  advertisingToken: string | undefined,
) {
  if (options.callback) {
    const payload = {
      advertisingToken: advertisingToken,
      advertising_token: advertisingToken,
      status: status,
      statusText: statusText,
    };
    try {
      options.callback(payload);
    } catch (exception) {
      console.warn('UID2 init callback threw an exception', exception);
    }
  }
}
