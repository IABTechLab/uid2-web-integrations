import { Logger } from './sdk/logger';
import { ApiClientOptions } from './apiClient';
import { CookieOptions } from './cookieManager';
import { Identity } from './Identity';
import { InitCallbackOptions } from './initCallbacks';

export type SdkOptions = BaseSdkOptions & InitCallbackOptions & CookieOptions & ApiClientOptions;
type BaseSdkOptions = {
  refreshRetryPeriod?: number;
  identity?: Identity;
  useCookie?: boolean;
  logger?: Logger;
};

export function isSDKOptionsOrThrow(maybeOpts: SdkOptions | unknown): maybeOpts is SdkOptions {
  if (typeof maybeOpts !== 'object' || maybeOpts === null) {
    throw new TypeError('opts must be an object');
  }
  const opts = maybeOpts as SdkOptions;
  if (opts.callback !== undefined && typeof opts.callback !== 'function') {
    throw new TypeError('opts.callback, if provided, must be a function');
  }
  if (typeof opts.refreshRetryPeriod !== 'undefined') {
    if (typeof opts.refreshRetryPeriod !== 'number')
      throw new TypeError('opts.refreshRetryPeriod must be a number');
    else if (opts.refreshRetryPeriod < 1000)
      throw new RangeError('opts.refreshRetryPeriod must be >= 1000');
  }
  return true;
}
