import { NAME_CURVE } from '../mocks';
import { Uid2ApiClient } from '../uid2ApiClient';

describe('UID2 API client tests', () => {
  let uid2ApiClient: Uid2ApiClient;
  let serverKeyPair: CryptoKeyPair;
  let serverPublicKey: ArrayBuffer;

  beforeAll(async () => {
    serverKeyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: NAME_CURVE,
      },
      false,
      ['deriveKey']
    );
    serverPublicKey = await crypto.subtle.exportKey('spki', serverKeyPair.publicKey);
  });

  beforeEach(() => {
    uid2ApiClient = new Uid2ApiClient({});
  });

  describe('#callCstgApi', () => {});
});
