import { NAME_CURVE, decryptClientRequest, encryptServerMessage, makeIdentityV2 } from '../mocks';
import { bytesToBase64 } from '../encoding/uid2Base64';
import { UID2CstgBox } from '../uid2CstgBox';
import { exportPublicKey } from '../uid2CstgCrypto';

const CryptoKey = require('crypto').webcrypto.CryptoKey;

describe('UID2CstgBox', () => {
  let serverPublicKey: ArrayBuffer;
  let cstgBox: UID2CstgBox;
  let serverKeyPair: CryptoKeyPair;

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
    cstgBox = await UID2CstgBox.build(bytesToBase64(new Uint8Array(serverPublicKey)));
  });

  const identity = { email: 'test@example.com' };
  const encoder = new TextEncoder();
  const additionalData = encoder.encode(JSON.stringify([Date.now]));
  const plaintext = encoder.encode(JSON.stringify(identity));

  it('can encrypt data', async () => {
    const { ciphertext } = await cstgBox.encrypt(plaintext, additionalData);
    expect(new Uint8Array(ciphertext)).not.toEqual(plaintext);
  });

  it('encrypted message should be able to be decrypted', async () => {
    const { iv, ciphertext } = await cstgBox.encrypt(plaintext, additionalData);
    const clientPublicKey = await exportPublicKey(cstgBox.clientPublicKey);

    const decryptedMessage = await decryptClientRequest(ciphertext, iv, additionalData, {
      clientPublicKey,
      serverPrivateKey: serverKeyPair.privateKey,
    });
    expect(JSON.parse(decryptedMessage)).toEqual(identity);
  });

  it('can export public key', async () => {
    const clientPublicKey = await exportPublicKey(cstgBox.clientPublicKey);
    expect(clientPublicKey).not.toBeNull();
    const importedPublicKey = await crypto.subtle.importKey(
      'spki',
      clientPublicKey,
      { name: 'ECDH', namedCurve: NAME_CURVE },
      false,
      []
    );
    expect(importedPublicKey).toBeInstanceOf(CryptoKey);
    expect(importedPublicKey.algorithm).toEqual({
      name: 'ECDH',
      namedCurve: NAME_CURVE,
    });
  });

  it('can decrypt message from server', async () => {
    const clientPublicKey = await exportPublicKey(cstgBox.clientPublicKey);
    const identity = makeIdentityV2();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await encryptServerMessage(JSON.stringify(identity), iv, {
      clientPublicKey,
      serverPrivateKey: serverKeyPair.privateKey,
    });
    const decrypted = await cstgBox.decrypt(iv, new Uint8Array(ciphertext));
    const decryptedResponse = new TextDecoder().decode(decrypted);
    expect(JSON.parse(decryptedResponse)).toEqual(identity);
  });
});
