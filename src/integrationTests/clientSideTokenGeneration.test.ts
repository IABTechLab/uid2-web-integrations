import * as mocks from '../mocks';
import { NAME_CURVE } from '../mocks';
import { base64ToBytes, bytesToBase64 } from '../encoding/base64';
import { EventType } from '../callbackManager';
import { sdkWindow, UID2 } from '../uid2Sdk';
import { EUID } from '../euidSdk';

let uid2: UID2;
let euid: EUID;
let uid2OrEuid: UID2 | EUID;
let xhrMock: any;
let serverKeyPair: CryptoKeyPair;
let serverPublicKeyUid2: string;
let serverPublicKeyEuid: string;

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
  serverPublicKeyUid2 = `UID2-X-L-` + bytesToBase64(new Uint8Array(serverPubKeyArray));
  serverPublicKeyEuid = `EUID-X-L-` + bytesToBase64(new Uint8Array(serverPubKeyArray));
});

beforeEach(() => {
  xhrMock = new mocks.XhrMock(sdkWindow);
  mocks.setCookieMock(sdkWindow.document);
  removeUid2LocalStorage();
  removeEuidLocalStorage();
});

afterEach(() => {
  mocks.resetFakeTime();
});

const removeUid2LocalStorage = mocks.removeUid2LocalStorage;
const removeEuidLocalStorage = mocks.removeEuidLocalStorage;

describe('Client-side token generation Tests', () => {
  const scenarios = [
    {
      name: 'setIdentityFromEmail',
      identityType: 'uid2',
      setInvalidIdentity: () => uid2.setIdentityFromEmail('test.com', mocks.makeUid2CstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        uid2.setIdentityFromEmail(
          'test@example.com',
          mocks.makeUid2CstgOption({ serverPublicKey })
        ),
      getIdentity: () => mocks.getUid2(),
    },
    {
      name: 'setIdentityFromEmailHash',
      identityType: 'uid2',
      setInvalidIdentity: () =>
        uid2.setIdentityFromEmailHash('test@example.com', mocks.makeUid2CstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        uid2.setIdentityFromEmailHash(
          'lz3+Rj7IV4X1+Vr1ujkG7tstkxwk5pgkqJ6mXbpOgTs=',
          mocks.makeUid2CstgOption({ serverPublicKey })
        ),
      getIdentity: () => mocks.getUid2(),
    },
    {
      name: 'setIdentityFromPhone',
      identityType: 'uid2',
      setInvalidIdentity: () =>
        uid2.setIdentityFromPhone('12345678910', mocks.makeUid2CstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        uid2.setIdentityFromPhone('+12345678910', mocks.makeUid2CstgOption({ serverPublicKey })),
      getIdentity: () => mocks.getUid2(),
    },
    {
      name: 'setIdentityFromPhoneHash',
      identityType: 'uid2',
      setInvalidIdentity: () =>
        uid2.setIdentityFromPhoneHash('+12345678910', mocks.makeUid2CstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        uid2.setIdentityFromPhoneHash(
          'kVJ+4ilhrqm3HZDDnCQy4niZknvCoM4MkoVzZrQSdJw=',
          mocks.makeUid2CstgOption({ serverPublicKey })
        ),
      getIdentity: () => mocks.getUid2(),
    },
    {
      name: 'setIdentityFromEmail',
      identityType: 'euid',
      setInvalidIdentity: () => euid.setIdentityFromEmail('test.com', mocks.makeEuidCstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        euid.setIdentityFromEmail(
          'test@example.com',
          mocks.makeEuidCstgOption({ serverPublicKey })
        ),
      getIdentity: () => mocks.getEuid(),
    },
    {
      name: 'setIdentityFromEmailHash',
      identityType: 'euid',
      setInvalidIdentity: () =>
        euid.setIdentityFromEmailHash('test@example.com', mocks.makeEuidCstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        euid.setIdentityFromEmailHash(
          'lz3+Rj7IV4X1+Vr1ujkG7tstkxwk5pgkqJ6mXbpOgTs=',
          mocks.makeEuidCstgOption({ serverPublicKey })
        ),
      getIdentity: () => mocks.getEuid(),
    },
    {
      name: 'setIdentityFromPhone',
      identityType: 'euid',
      setInvalidIdentity: () =>
        euid.setIdentityFromPhone('12345678910', mocks.makeEuidCstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        euid.setIdentityFromPhone('+12345678910', mocks.makeEuidCstgOption({ serverPublicKey })),
      getIdentity: () => mocks.getEuid(),
    },
    {
      name: 'setIdentityFromPhoneHash',
      identityType: 'euid',
      setInvalidIdentity: () =>
        euid.setIdentityFromPhoneHash('+12345678910', mocks.makeEuidCstgOption()),
      setIdentity: (serverPublicKey?: string) =>
        euid.setIdentityFromPhoneHash(
          'kVJ+4ilhrqm3HZDDnCQy4niZknvCoM4MkoVzZrQSdJw=',
          mocks.makeEuidCstgOption({ serverPublicKey })
        ),
      getIdentity: () => mocks.getEuid(),
    },
  ];

  scenarios.forEach((scenario) => {
    describe(scenario.name, () => {
      beforeEach(() => {
        if (scenario.identityType === 'uid2') {
          uid2 = new UID2();
          uid2.init({});
          uid2OrEuid = uid2;
        } else if (scenario.identityType === 'euid') {
          euid = new EUID();
          euid.init({});
          uid2OrEuid = euid;
        }
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
            uid2OrEuid.callbacks.push((eventType, payload) => {
              if (eventType === EventType.IdentityUpdated) {
                expect(payload.identity).toEqual(cstgToken);
                done();
              }
            });
            scenario.setIdentity(
              scenario.identityType === 'uid2' ? serverPublicKeyUid2 : serverPublicKeyEuid
            );
          });

          test('should set identity to storage', async () => {
            await scenario.setIdentity(
              scenario.identityType === 'uid2' ? serverPublicKeyUid2 : serverPublicKeyEuid
            );
            expect(scenario.getIdentity()).toEqual(cstgToken);
          });

          test('UID2 or EUID should be in available state', async () => {
            await scenario.setIdentity(
              scenario.identityType === 'uid2' ? serverPublicKeyUid2 : serverPublicKeyEuid
            );
            (expect(uid2OrEuid) as any).toBeInAvailableState(cstgToken.advertising_token);
          });

          test('should refresh token when generated token requires a refresh', async () => {
            await scenario.setIdentity(
              scenario.identityType === 'uid2' ? serverPublicKeyUid2 : serverPublicKeyEuid
            );
            const refreshedToken = {
              ...mocks.makeIdentityV2(),
              advertising_token: 'refreshed_token',
            };
            jest.setSystemTime(refreshFrom);
            jest.runOnlyPendingTimers();
            xhrMock.sendIdentityInEncodedResponse(refreshedToken, cstgToken.refresh_response_key);
            expect(await uid2OrEuid!.getAdvertisingTokenAsync()).toBe(
              refreshedToken.advertising_token
            );
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
            await expect(
              scenario.setIdentity(
                scenario.identityType === 'uid2' ? serverPublicKeyUid2 : serverPublicKeyEuid
              )
            ).rejects.toEqual('Client error: Here is a client error');
            expect(scenario.getIdentity()).toBeNull();
          });
          test('should be in unavailable state', async () => {
            await expect(
              scenario.setIdentity(
                scenario.identityType === 'uid2' ? serverPublicKeyUid2 : serverPublicKeyEuid
              )
            ).rejects.toEqual('Client error: Here is a client error');
            (expect(uid2OrEuid) as any).toBeInUnavailableState();
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
          test('UID2 or EUID should be in optout state', async () => {
            await scenario.setIdentity(
              scenario.identityType === 'uid2' ? serverPublicKeyUid2 : serverPublicKeyEuid
            );
            (expect(uid2OrEuid) as any).toBeInOptoutState();
          });

          test('The callback should be called with no identity', (done) => {
            uid2OrEuid.callbacks.push((eventType, payload) => {
              if (eventType === EventType.IdentityUpdated) {
                expect(payload.identity).toBeNull();
                done();
              }
            });
            scenario.setIdentity(
              scenario.identityType === 'uid2' ? serverPublicKeyUid2 : serverPublicKeyEuid
            );
          });

          test('The callback should be called with an optout event', (done) => {
            uid2OrEuid.callbacks.push((eventType, payload) => {
              if (eventType === EventType.OptoutReceived) {
                done();
              }
            });
            scenario.setIdentity(
              scenario.identityType === 'uid2' ? serverPublicKeyUid2 : serverPublicKeyEuid
            );
          });
        });
      });
    });
  });
});
