import { Uid2ApiClientOptions } from "./uid2ApiClient";
import { UID2CookieOptions } from "./uid2CookieManager";
import { Uid2Identity } from "./Uid2Identity";
import { InitCallbackOptions } from "./Uid2InitCallbacks";

export type Uid2Options = BaseUid2Options & InitCallbackOptions & UID2CookieOptions & Uid2ApiClientOptions;
type BaseUid2Options = {
    refreshRetryPeriod?: number;
    identity?: Uid2Identity;
    enableSecureSignals?: boolean;
}

export function isUID2OptionsOrThrow(maybeOpts: Uid2Options | unknown): maybeOpts is Uid2Options {
    if (typeof maybeOpts !== 'object' || maybeOpts === null) {
        throw new TypeError('opts must be an object');
    }
    const opts = maybeOpts as Uid2Options;
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
