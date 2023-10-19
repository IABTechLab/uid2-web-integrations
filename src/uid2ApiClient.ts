import { UID2 } from './uid2Sdk';
import { isValidIdentity, Uid2Identity } from './Uid2Identity';
import { UID2CstgBox } from './uid2CstgBox';
import { exportPublicKey } from './uid2CstgCrypto';
import { ClientSideIdentityOptions, stripPublicKeyPrefix } from './uid2ClientSideIdentityOptions';
import { base64ToBytes, bytesToBase64 } from './uid2Base64';

export type RefreshResultWithoutIdentity = {
  status: ResponseStatusWithoutBody;
};
export type SuccessRefreshResult = {
  status: ResponseStatusRequiringBody;
  identity: Uid2Identity;
};
export type RefreshResult = SuccessRefreshResult | RefreshResultWithoutIdentity;

export type SuccessCstgResult = {
  status: 'success';
  identity: Uid2Identity;
};
export type CstgResult = SuccessCstgResult;

type RefreshApiResponse =
  | {
      status: ResponseStatusRequiringBody;
      body: Uid2Identity;
    }
  | {
      status: ResponseStatusWithoutBody;
    };
export type ResponseStatus = ResponseStatusRequiringBody | ResponseStatusWithoutBody;
type ResponseStatusRequiringBody = 'success';
type ResponseStatusWithoutBody = 'optout' | 'expired_token';
type UnvalidatedRefreshResponse = RefreshApiResponse | { status: unknown };
function isValidRefreshResponse(
  response: unknown | UnvalidatedRefreshResponse,
): response is RefreshApiResponse {
  if (isUnvalidatedRefreshResponse(response)) {
    return (
      response.status === 'optout' ||
      response.status === 'expired_token' ||
      (response.status === 'success' && 'body' in response && isValidIdentity(response.body))
    );
  }
  return false;
}
function isUnvalidatedRefreshResponse(response: unknown): response is UnvalidatedRefreshResponse {
  return typeof response === 'object' && response !== null && 'status' in response;
}

type CstgApiSuccessResponse = {
  status: 'success';
  body: Uid2Identity;
};
type CstgApiClientErrorResponse = {
  status: 'client_error';
  message: string;
};
type CstgApiForbiddenResponse = {
  status: 'invalid_http_origin';
  message: string;
};

export type CstgResponse = CstgApiSuccessResponse;

function isCstgApiSuccessResponse(response: unknown): response is CstgApiSuccessResponse {
  if (response === null || typeof response !== 'object') {
    return false;
  }

  const successResponse = response as CstgApiSuccessResponse;
  return successResponse.status === 'success' && isValidIdentity(successResponse.body);
}

function isCstgApiClientErrorResponse(response: unknown): response is CstgApiClientErrorResponse {
  if (response === null || typeof response !== 'object') {
    return false;
  }

  const errorResponse = response as CstgApiClientErrorResponse;
  return errorResponse.status === 'client_error' && typeof errorResponse.message === 'string';
}

function isCstgApiForbiddenResponse(response: unknown): response is CstgApiForbiddenResponse {
  if (response === null || typeof response !== 'object') {
    return false;
  }

  const forbiddenResponse = response as CstgApiForbiddenResponse;
  return (
    forbiddenResponse.status === 'invalid_http_origin' &&
    typeof forbiddenResponse.message === 'string'
  );
}

export type Uid2ApiClientOptions = {
  baseUrl?: string;
};

export class Uid2ApiClient {
  private _baseUrl: string;
  private _clientVersion: string;
  private _requestsInFlight: XMLHttpRequest[] = [];
  constructor(opts: Uid2ApiClientOptions) {
    this._baseUrl = opts.baseUrl ?? 'https://prod.uidapi.com';
    this._clientVersion = 'uid2-sdk-' + UID2.VERSION;
  }

  public hasActiveRequests() {
    return this._requestsInFlight.length > 0;
  }

  private ResponseToRefreshResult(
    response: UnvalidatedRefreshResponse | unknown,
  ): RefreshResult | string {
    if (isValidRefreshResponse(response)) {
      if (response.status === 'success')
        return { status: response.status, identity: response.body };
      return response;
    } else return "Response didn't contain a valid status";
  }

  public abortActiveRequests() {
    this._requestsInFlight.forEach((req) => {
      req.abort();
    });
    this._requestsInFlight = [];
  }

  public callRefreshApi(refreshDetails: Uid2Identity): Promise<RefreshResult> {
    const url = this._baseUrl + '/v2/token/refresh';
    const req = new XMLHttpRequest();
    this._requestsInFlight.push(req);
    req.overrideMimeType('text/plain');
    req.open('POST', url, true);
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
      this._requestsInFlight = this._requestsInFlight.filter((r) => r !== req);
      try {
        if (!refreshDetails.refresh_response_key || req.status !== 200) {
          const response = JSON.parse(req.responseText) as unknown;
          const result = this.ResponseToRefreshResult(response);
          if (typeof result === 'string') rejectPromise(result);
          else resolvePromise(result);
        } else {
          const encodeResp = base64ToBytes(req.responseText);
          window.crypto.subtle
            .importKey(
              'raw',
              base64ToBytes(refreshDetails.refresh_response_key),
              { name: 'AES-GCM' },
              false,
              ['decrypt'],
            )
            .then(
              (key) => {
                //returns the symmetric key
                window.crypto.subtle
                  .decrypt(
                    {
                      name: 'AES-GCM',
                      iv: encodeResp.slice(0, 12), //The initialization vector you used to encrypt
                      tagLength: 128, //The tagLength you used to encrypt (if any)
                    },
                    key,
                    encodeResp.slice(12),
                  )
                  .then(
                    (decrypted) => {
                      const decryptedResponse = String.fromCharCode(...new Uint8Array(decrypted));
                      const response = JSON.parse(decryptedResponse) as unknown;
                      const result = this.ResponseToRefreshResult(response);
                      if (typeof result === 'string') rejectPromise(result);
                      else resolvePromise(result);
                    },
                    (reason) => console.warn(`Call to UID2 API failed`, reason),
                  );
              },
              (reason) => console.warn(`Call to UID2 API failed`, reason),
            );
        }
      } catch (err) {
        rejectPromise(err);
      }
    };
    req.send(refreshDetails.refresh_token);
    return promise;
  }

  public async callCstgApi(
    data: { emailHash: string } | { phoneHash: string },
    opts: ClientSideIdentityOptions,
  ): Promise<CstgResult> {
    const request =
      'emailHash' in data ? { email_hash: data.emailHash } : { phone_hash: data.phoneHash };

    const box = await UID2CstgBox.build(stripPublicKeyPrefix(opts.serverPublicKey));

    const encoder = new TextEncoder();

    const now = Date.now();
    const { iv, ciphertext } = await box.encrypt(
      encoder.encode(JSON.stringify(request)),
      encoder.encode(JSON.stringify([now])),
    );

    const exportedPublicKey = await exportPublicKey(box.clientPublicKey);

    const requestBody = {
      payload: bytesToBase64(new Uint8Array(ciphertext)),
      iv: bytesToBase64(new Uint8Array(iv)),
      public_key: bytesToBase64(new Uint8Array(exportedPublicKey)),
      timestamp: now,
      subscription_id: opts.subscriptionId,
    };

    const url = this._baseUrl + '/v2/token/client-generate';
    const req = new XMLHttpRequest();
    this._requestsInFlight.push(req);
    req.overrideMimeType('text/plain');
    req.open('POST', url, true);

    let resolvePromise: (result: CstgResult) => void;
    let rejectPromise: (reason: unknown) => void;
    const promise = new Promise<CstgResult>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    req.onreadystatechange = async () => {
      if (req.readyState !== req.DONE) return;
      this._requestsInFlight = this._requestsInFlight.filter((r) => r !== req);
      try {
        if (req.status === 200) {
          const encodedResp = base64ToBytes(req.responseText);
          const decrypted = await box.decrypt(encodedResp.slice(0, 12), encodedResp.slice(12));
          const decryptedResponse = new TextDecoder().decode(decrypted);
          const response = JSON.parse(decryptedResponse) as unknown;
          if (isCstgApiSuccessResponse(response)) {
            resolvePromise({
              status: 'success',
              identity: response.body,
            });
          } else {
            // A 200 should always be a success response.
            // Something has gone wrong.
            rejectPromise(
              `API error: Response body was invalid for HTTP status 200: ${decryptedResponse}`,
            );
          }
        } else if (req.status === 400) {
          const response = JSON.parse(req.responseText);
          if (isCstgApiClientErrorResponse(response)) {
            rejectPromise(`Client error: ${response.message}`);
          } else {
            // A 400 should always be a client error.
            // Something has gone wrong.
            rejectPromise(
              `API error: Response body was invalid for HTTP status 400: ${req.responseText}`,
            );
          }
        } else if (req.status === 403) {
          const response = JSON.parse(req.responseText);
          if (isCstgApiForbiddenResponse(response)) {
            rejectPromise(`Forbidden: ${response.message}`);
          } else {
            // A 403 should always be a forbidden response.
            // Something has gone wrong.
            rejectPromise(
              `API error: Response body was invalid for HTTP status 403: ${req.responseText}`,
            );
          }
        } else {
          rejectPromise(`API error: Unexpected HTTP status ${req.status}`);
        }
      } catch (err) {
        rejectPromise(err);
      }
    };

    req.send(JSON.stringify(requestBody));

    return await promise;
  }
}
