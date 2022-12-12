import { UID2 } from "./uid2Sdk";
import { isValidIdentity, Uid2Identity } from "./Uid2Identity";
import { PromiseOutcome } from "./uid2PromiseHandler";
import { EventType, Uid2CallbackPayload } from "./uid2CallbackManager";

export type RefreshResultWithoutIdentity = { status: ResponseStatusWithoutBody };
export type SuccessRefreshResult = {
    status: ResponseStatusRequiringBody;
    identity: Uid2Identity;
};
export type RefreshResult = SuccessRefreshResult | RefreshResultWithoutIdentity;

type RefreshApiResponse = {
    status: ResponseStatusRequiringBody;
    body: Uid2Identity;
} | {
    status: ResponseStatusWithoutBody;
};
export type ResponseStatus = ResponseStatusRequiringBody | ResponseStatusWithoutBody;
type ResponseStatusRequiringBody = "success";
type ResponseStatusWithoutBody = "optout" | "expired_token"
type UnvalidatedRefreshResponse = RefreshApiResponse | {status: unknown};
function isValidRefreshResponse(response: unknown | UnvalidatedRefreshResponse): response is RefreshApiResponse {
    if (isUnvalidatedRefreshResponse(response)) {
        return response.status === "optout" || response.status === "expired_token" ||
            (response.status === "success" && 'body' in response && isValidIdentity(response.body));
    }
    return false;
}
function isUnvalidatedRefreshResponse(response: unknown): response is UnvalidatedRefreshResponse {
    return typeof(response) === 'object' && response !== null && 'status' in response;
}
export type Uid2ApiClientOptions = {
    baseUrl?: string;
};

export class Uid2ApiClient {
    private _baseUrl: string;
    private _clientVersion: string;
    private _requestsInFlight: XMLHttpRequest[] = [];
    public _refreshingPromise: PromiseOutcome<string> | undefined;
    
    constructor(uid2Sdk: UID2, opts: Uid2ApiClientOptions) {
        this._baseUrl = opts.baseUrl ?? "https://prod.uidapi.com";
        this._clientVersion = 'uid2-sdk-' + UID2.VERSION;
        uid2Sdk.callbacks.push(this._handleEvent.bind(this));
    }

    public getFreshAdvertisingToken() {
        return new Promise<string>((resolve, reject) => {
            this._refreshingPromise = { resolve: resolve, reject: reject };
        });
    }

    private _handleEvent(eventType: EventType, payload: Uid2CallbackPayload) {
        if (!this._refreshingPromise) return;
        if (eventType === EventType.IdentityUpdated) {
            if (!this._requestsInFlight.length) {
                if ('identity' in payload && payload.identity) {
                    this._refreshingPromise.resolve(payload.identity.advertising_token);
                } else {
                    this._refreshingPromise.reject(new Error(`No identity available.`));
                }
            }
        }
    }

    private createArrayBuffer(text: string) {
        const arrayBuffer = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) {
            arrayBuffer[i] = text.charCodeAt(i);
        }
        return arrayBuffer;
    }

    public hasActiveRequests() {
        return this._requestsInFlight.length > 0;
    }

    private ResponseToRefreshResult(response: UnvalidatedRefreshResponse | unknown): RefreshResult | string {
        if (isValidRefreshResponse(response)) {
            if (response.status === "success") return { status: response.status, identity: response.body };
            return response;
        } else return "Response didn't contain a valid status";
    }

    public abortActiveRequests() {
        this._requestsInFlight.forEach(req => {
            req.abort();
        });
        this._requestsInFlight = [];
        // this.refreshingPromise.reject("Requests abort");
    }

    public callRefreshApi(refreshDetails: Uid2Identity): Promise<RefreshResult> {
        const url = this._baseUrl + "/v2/token/refresh";
        const req = new XMLHttpRequest();
        this._requestsInFlight.push(req);
        req.overrideMimeType("text/plain");
        req.open("POST", url, true);
        req.setRequestHeader('X-UID2-Client-Version', this._clientVersion);
        let resolvePromise: (result: RefreshResult) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let rejectPromise: (reason?: any) => void;
        const promise = new Promise<RefreshResult>((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        req.onreadystatechange = () => {
            if (req.readyState !== req.DONE) return;
            this._requestsInFlight = this._requestsInFlight.filter(r => r !== req);
            try {
                if(!refreshDetails.refresh_response_key || req.status !== 200) {
                    const response = JSON.parse(req.responseText) as unknown;
                    const result = this.ResponseToRefreshResult(response);
                    if (typeof result === 'string') rejectPromise(result);
                    else resolvePromise(result);
                } else {
                    const encodeResp = this.createArrayBuffer(atob(req.responseText));
                    window.crypto.subtle.importKey("raw", this.createArrayBuffer(atob(refreshDetails.refresh_response_key)),
                        { name: "AES-GCM" }, false, ["decrypt"]
                    ).then((key) => {
                        //returns the symmetric key
                        window.crypto.subtle.decrypt({
                                name: "AES-GCM",
                                iv: encodeResp.slice(0, 12), //The initialization vector you used to encrypt
                                tagLength: 128, //The tagLength you used to encrypt (if any)
                            },
                            key,
                            encodeResp.slice(12)
                        ).then((decrypted) => {
                            const decryptedResponse = String.fromCharCode(...new Uint8Array(decrypted));
                            const response = JSON.parse(decryptedResponse) as unknown;
                            const result = this.ResponseToRefreshResult(response);
                            if (typeof result === 'string') rejectPromise(result);
                            else resolvePromise(result);
                        }, (reason) => console.warn(`Call to UID2 API failed`, reason))
                    }, (reason) => console.warn(`Call to UID2 API failed`, reason))
                }
            } catch (err) {
                rejectPromise(err);
            }
        };
        req.send(refreshDetails.refresh_token);
        return promise;
    }
}
