import * as mocks from '../mocks';
import { NAME_CURVE } from '../mocks';
import { base64ToBytes, bytesToBase64 } from '../encoding/base64';
import { EventType } from '../callbackManager';
import { sdkWindow, UID2 } from '../uid2Sdk';

let uid2: UID2;
let xhrMock: any;
let serverKeyPair: CryptoKeyPair;
let serverPublicKey: string;

mocks.setupFakeTime();

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
  xhrMock = new mocks.XhrMock(sdkWindow);
  mocks.setCookieMock(sdkWindow.document);
  removeUid2LocalStorage();
});

afterEach(() => {
  mocks.resetFakeTime();
});

const removeUid2LocalStorage = mocks.removeUid2LocalStorage;

describe('Client-side token generation Tests', () => {
  const scenarios = [
    {
      name: 'setIdentityFromEmail',
      setInvalidIdentity: () => uid2.setIdentityFromEmail('test.com', mocks.makeCstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        uid2.setIdentityFromEmail('test@example.com', mocks.makeCstgOption({ serverPublicKey })),
    },
    {
      name: 'setIdentityFromEmailHash',
      setInvalidIdentity: () =>
        uid2.setIdentityFromEmailHash('test@example.com', mocks.makeCstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        uid2.setIdentityFromEmailHash(
          'lz3+Rj7IV4X1+Vr1ujkG7tstkxwk5pgkqJ6mXbpOgTs=',
          mocks.makeCstgOption({ serverPublicKey })
        ),
    },
    {
      name: 'setIdentityFromPhone',
      setInvalidIdentity: () => uid2.setIdentityFromPhone('12345678910', mocks.makeCstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        uid2.setIdentityFromPhone('+12345678910', mocks.makeCstgOption({ serverPublicKey })),
    },
    {
      name: 'setIdentityFromPhoneHash',
      setInvalidIdentity: () =>
        uid2.setIdentityFromPhoneHash('+12345678910', mocks.makeCstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        uid2.setIdentityFromPhoneHash(
          'kVJ+4ilhrqm3HZDDnCQy4niZknvCoM4MkoVzZrQSdJw=',
          mocks.makeCstgOption({ serverPublicKey })
        ),
    },
  ];

  scenarios.forEach((scenario) => {
    describe(scenario.name, () => {
      beforeEach(() => {
        uid2 = new UID2();
        uid2.init({});
      });

      describe('When invalid identity is provided', () => {
        test('should throw error', () => {
          expect(scenario.setInvalidIdentity()).rejects.toBeInstanceOf(Error);
        });
      });

      describe('When valid identity is provided', () => {
        describe('when call cstg API succeeds', () => {
          const refreshFrom = Date.now() + 100;
          const cstgToken = mocks.makeIdentityV2({
            advertising_token: 'cstg_advertising_token',
            refresh_from: refreshFrom,
          });
          beforeEach(() => {
            xhrMock.send.mockImplementationOnce((body: string) => {
              const requestBody = JSON.parse(body);
              xhrMock.sendEncryptedCSTGResponse(
                {
                  clientPublicKey: base64ToBytes(requestBody.public_key),
                  serverPrivateKey: serverKeyPair.privateKey,
                },
                { status: 'success', body: cstgToken }
              );
            });
          });

          test('should invoke the callback when token is generated', (done) => {
            uid2.callbacks.push((eventType, payload) => {
              if (eventType === EventType.IdentityUpdated) {
                expect(payload.identity).toEqual(cstgToken);
                done();
              }
            });
            scenario.setIdentity(serverPublicKey);
          });

          test('should set identity to storage', async () => {
            await scenario.setIdentity(serverPublicKey);
            expect(mocks.getUid2()).toEqual(cstgToken);
          });

          test('UID2 should be in available state', async () => {
            await scenario.setIdentity(serverPublicKey);
            (expect(uid2) as any).toBeInAvailableState(cstgToken.advertising_token);
          });

          test('should refresh token when generated token requires a refresh', async () => {
            await scenario.setIdentity(serverPublicKey);
            const refreshedToken = {
              ...mocks.makeIdentityV2(),
              advertising_token: 'refreshed_token',
            };
            jest.setSystemTime(refreshFrom);
            jest.runOnlyPendingTimers();
            xhrMock.sendIdentityInEncodedResponse(refreshedToken, cstgToken.refresh_response_key);
            expect(await uid2!.getAdvertisingTokenAsync()).toBe(refreshedToken.advertising_token);
          });
        });

        describe('when call cstg API failed', () => {
          beforeEach(() => {
            xhrMock.send.mockImplementation(() => {
              xhrMock.sendApiResponse({
                responseText: JSON.stringify({
                  status: 'client_error',
                  message: 'Here is a client error',
                }),
                status: 400,
              });
            });
          });
          test('should not set identity', async () => {
            await expect(scenario.setIdentity(serverPublicKey)).rejects.toEqual(
              'Client error: Here is a client error'
            );
            expect(mocks.getUid2()).toBeNull();
          });
          test('should be in unavailable state', async () => {
            await expect(scenario.setIdentity(serverPublicKey)).rejects.toEqual(
              'Client error: Here is a client error'
            );
            (expect(uid2) as any).toBeInUnavailableState();
          });
        });

        describe('when optout response is received', () => {
          beforeEach(() => {
            xhrMock.send.mockImplementationOnce((body: string) => {
              const requestBody = JSON.parse(body);
              xhrMock.sendEncryptedCSTGResponse(
                {
                  clientPublicKey: base64ToBytes(requestBody.public_key),
                  serverPrivateKey: serverKeyPair.privateKey,
                },
                { status: 'optout' }
              );
            });
          });
          test('UID2 should be in optout state', async () => {
            await scenario.setIdentity(serverPublicKey);
            (expect(uid2) as any).toBeInOptoutState();
          });

          test('The callback should be called with no identity', (done) => {
            uid2.callbacks.push((eventType, payload) => {
              if (eventType === EventType.IdentityUpdated) {
                expect(payload.identity).toBeNull();
                done();
              }
            });
            scenario.setIdentity(serverPublicKey);
          });

          test('The callback should be called with an optout event', (done) => {
            uid2.callbacks.push((eventType, payload) => {
              if (eventType === EventType.OptoutReceived) {
                done();
              }
            });
            scenario.setIdentity(serverPublicKey);
          });
        });
      });
    });
  });
});
