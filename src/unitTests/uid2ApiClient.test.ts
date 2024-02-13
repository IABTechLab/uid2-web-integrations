import { NAME_CURVE, XhrMock, makeCstgOption, makeIdentityV2 } from '../mocks';
import { Uid2ApiClient } from '../uid2ApiClient';
import { base64ToBytes, bytesToBase64 } from '../encoding/uid2Base64';
import { sdkWindow } from '../uid2Sdk';

describe('UID2 API client tests', () => {
  let uid2ApiClient: Uid2ApiClient;
  let serverKeyPair: CryptoKeyPair;
  let serverPublicKey: string;
  let xhrMock: any;

  beforeAll(async () => {
    serverKeyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: NAME_CURVE,
      },
      false,
      ['deriveKey']
    );

    const serverPubKeyArray = await crypto.subtle.exportKey('spki', serverKeyPair.publicKey);
    serverPublicKey = `UID2-X-L-` + bytesToBase64(new Uint8Array(serverPubKeyArray));
  });

  beforeEach(() => {
    uid2ApiClient = new Uid2ApiClient({}, 'https://prod.uidapi.com', 'UID2');
    xhrMock = new XhrMock(sdkWindow);
  });

  describe('#callCstgApi', () => {
    const makeCstgApiCall = async () => {
      return uid2ApiClient.callCstgApi(
        { emailHash: 'lz3+Rj7IV4X1+Vr1ujkG7tstkxwk5pgkqJ6mXbpOgTs=' },
        makeCstgOption({ serverPublicKey })
      );
    };

    describe('When API returns 200', () => {
      it('should decrypt identity from API response', async () => {
        const uid2Token = makeIdentityV2();
        xhrMock.send.mockImplementation((body: string) => {
          const requestBody = JSON.parse(body);
          xhrMock.sendEncryptedCSTGResponse(
            {
              clientPublicKey: base64ToBytes(requestBody.public_key),
              serverPrivateKey: serverKeyPair.privateKey,
            },
            { status: 'success', body: uid2Token }
          );
        });

        const cstgResult = await makeCstgApiCall();
        expect(cstgResult.identity).toEqual(uid2Token);
      });

      it('should throw error when response has invalid response body', async () => {
        xhrMock.send.mockImplementation((body: string) => {
          const requestBody = JSON.parse(body);
          xhrMock.sendEncryptedCSTGResponse(
            {
              clientPublicKey: base64ToBytes(requestBody.public_key),
              serverPrivateKey: serverKeyPair.privateKey,
            },
            {}
          );
        });

        await expect(
          uid2ApiClient.callCstgApi(
            { emailHash: 'lz3+Rj7IV4X1+Vr1ujkG7tstkxwk5pgkqJ6mXbpOgTs=' },
            makeCstgOption({ serverPublicKey })
          )
        ).rejects.toContain('API error: Response body was invalid for HTTP status 200:');
      });
    });

    describe('When API returns 400', () => {
      it('should throw client side error with error message when response has client_error status', async () => {
        xhrMock.send.mockImplementation(() => {
          xhrMock.sendApiResponse({
            responseText: JSON.stringify({
              status: 'client_error',
              message: 'Here is a client error',
            }),
            status: 400,
          });
        });
        await expect(makeCstgApiCall()).rejects.toEqual('Client error: Here is a client error');
      });

      it('should throw response body was invalid when response is not structured', async () => {
        xhrMock.send.mockImplementation(() => {
          xhrMock.sendApiResponse({
            responseText: JSON.stringify({}),
            status: 400,
          });
        });

        await expect(makeCstgApiCall()).rejects.toContain(
          'API error: Response body was invalid for HTTP status 400:'
        );
      });
    });

    describe('When API returns 403', () => {
      it('should throw forbidden error with error message when response has invalid_http_origin status', async () => {
        xhrMock.send.mockImplementation(() => {
          xhrMock.sendApiResponse({
            responseText: JSON.stringify({
              status: 'invalid_http_origin',
              message: 'Domain is invalid',
            }),
            status: 403,
          });
        });

        await expect(makeCstgApiCall()).rejects.toContain('Forbidden: Domain is invalid');
      });

      it('should throw response body was invalid when response is not structured', async () => {
        xhrMock.send.mockImplementation(() => {
          xhrMock.sendApiResponse({
            responseText: JSON.stringify({}),
            status: 403,
          });
        });

        await expect(makeCstgApiCall()).rejects.toContain(
          'API error: Response body was invalid for HTTP status 403:'
        );
      });
    });

    describe('When API returns other status code', () => {
      it('should throw unexpected HTTP status', async () => {
        xhrMock.send.mockImplementation(() => {
          xhrMock.sendApiResponse({
            responseText: JSON.stringify({}),
            status: 500,
          });
        });

        await expect(makeCstgApiCall()).rejects.toContain('API error: Unexpected HTTP status 500');
      });
    });
  });
});
