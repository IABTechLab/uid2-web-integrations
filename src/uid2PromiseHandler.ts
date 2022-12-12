import { UID2 } from "./uid2Sdk";
import { EventType } from "./uid2CallbackManager";

export type PromiseOutcome<T> = {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason: Error|string) => void;
    callback: () => Promise<string>;
}

export class UID2PromiseHandler {
    private _promises: PromiseOutcome<string>[] = [];
    private _seenInitOrRejectAll = false;
    private _handleEvent(eventType: EventType) {
        if (eventType === EventType.InitCompleted) {
            this._seenInitOrRejectAll = true;
            this._promises.forEach(p => {
                p.resolve(p.callback())
            });
            this._promises = [];
        }
    }
    public rejectAllPromises(reason: string | Error) {
        this._seenInitOrRejectAll = true;
        this._promises.forEach(p => {
            p.reject(reason); 
        });
        this._promises = [];
    }
    // n.b. If this has seen an SDK init or a reject-all call, it'll reply immediately with the provided token or rejection.
    // Otherwise, it will ignore the provided token and resolve with the identity available when the init event arrives
    public createMaybeDeferredPromise(tokenCallback: () => Promise<string>) {
        if (!this._seenInitOrRejectAll) {
            return new Promise<string>((resolve, reject) => {
                this._promises.push({ resolve: resolve, reject: reject, callback: tokenCallback });
            });
        } else {
            return tokenCallback()
        }
    }

    constructor(uid2Sdk: UID2) {
        uid2Sdk.callbacks.push(this._handleEvent.bind(this));
    }
}

