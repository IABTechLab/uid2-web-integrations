import { bytesToBase64 } from '../uid2Base64';
import {
  decrypt,
  deriveKey,
  encrypt,
  exportPublicKey,
  generateKeyPair,
  importPublicKey,
} from '../uid2CstgCrypto';

const CryptoKey = require('crypto').webcrypto.CryptoKey;

const generateSharedKey = (keyUsages: KeyUsage[]) => {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 128 }, true, keyUsages);
};

const sharedKeyIsMatched = async (sharedKey1: CryptoKey, sharedKey2: CryptoKey) => {
  const testMessage = 'Test secret message';
  const plaintext = new TextEncoder().encode(testMessage);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    sharedKey1,
    plaintext
  );

  try {
    const decryptedData = await decrypt(new Uint8Array(ciphertext), sharedKey2, iv);

    const decryptedMessage = String.fromCharCode(...new Uint8Array(decryptedData));
    return decryptedMessage === testMessage;
  } catch (_err) {
    return false;
  }
};

describe('uid2CstgCrypto Tests', () => {
  describe('#encrypt', () => {
    it('should encrypt data using a valid key and return ciphertext', async () => {
      const sharedKey = await generateSharedKey(['encrypt']);
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const ciphertext = await encrypt(plaintext, sharedKey, iv, new Uint8Array());
      expect(new Uint8Array(ciphertext)).not.toEqual(plaintext);
    });

    it('should produce different ciphertext for different IVs', async () => {
      const sharedKey = await generateSharedKey(['encrypt']);
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const iv1 = window.crypto.getRandomValues(new Uint8Array(12));
      const iv2 = window.crypto.getRandomValues(new Uint8Array(12));

      const ciphertext1 = await encrypt(plaintext, sharedKey, iv1, new Uint8Array());
      const ciphertext2 = await encrypt(plaintext, sharedKey, iv2, new Uint8Array());
      expect(new Uint8Array(ciphertext1)).not.toEqual(new Uint8Array(ciphertext2));
    });

    it('should be able to be decrypt', async () => {
      const messageToBeEncrypted = 'This is a secret message';
      const sharedKey = await generateSharedKey(['encrypt', 'decrypt']);
      const plaintext = new TextEncoder().encode(messageToBeEncrypted);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const additionalData = new TextEncoder().encode('Additional data');

      const ciphertext = await encrypt(plaintext, sharedKey, iv, additionalData);

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData,
        },
        sharedKey,
        ciphertext
      );
      const decryptedMessage = String.fromCharCode(...new Uint8Array(decryptedData));
      expect(decryptedMessage).toEqual(messageToBeEncrypted);
    });
  });

  describe('#decrypt', () => {
    it('should decrypt ciphertext using a valid key and IV and return plaintext', async () => {
      const sharedKey = await generateSharedKey(['encrypt', 'decrypt']);
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const ciphertext = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        sharedKey,
        plaintext
      );

      const decrypted = await decrypt(new Uint8Array(ciphertext), sharedKey, iv);

      const decryptedArray = Array.from(new Uint8Array(decrypted));
      const plaintextArray = Array.from(plaintext);

      expect(decryptedArray).toEqual(plaintextArray);
    });

    it('should not decrypt with an incorrect IV', async () => {
      const sharedKey = await generateSharedKey(['encrypt', 'decrypt']);
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const iv1 = window.crypto.getRandomValues(new Uint8Array(12));
      const iv2 = window.crypto.getRandomValues(new Uint8Array(12));

      const ciphertext = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv1,
        },
        sharedKey,
        plaintext
      );
      await expect(decrypt(new Uint8Array(ciphertext), sharedKey, iv2)).rejects.toHaveProperty(
        'message',
        'The operation failed for an operation-specific reason'
      );
    });

    it('should not decrypt data with additional', async () => {
      const sharedKey = await generateSharedKey(['encrypt', 'decrypt']);
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData: new Uint8Array([1, 2, 3]),
        },
        sharedKey,
        plaintext
      );
      await expect(decrypt(new Uint8Array(ciphertext), sharedKey, iv)).rejects.toHaveProperty(
        'message',
        'The operation failed for an operation-specific reason'
      );
    });
  });

  describe('#generateKeyPair', () => {
    it(' should return a valid CryptoKePair', async () => {
      const keyPair = await generateKeyPair('P-256');
      expect(keyPair.publicKey).toBeInstanceOf(CryptoKey);
      expect(keyPair.privateKey).toBeInstanceOf(CryptoKey);
    });
  });

  describe('#deriveKey', () => {
    it('should derive the same shared key from two matching key pairs', async () => {
      const keyPair1 = await generateKeyPair('P-256');
      const keyPair2 = await generateKeyPair('P-256');

      const sharedKey1 = await deriveKey(keyPair1.publicKey, keyPair2.privateKey);
      const sharedKey2 = await deriveKey(keyPair2.publicKey, keyPair1.privateKey);

      expect(await sharedKeyIsMatched(sharedKey1, sharedKey2)).toBeTruthy();
    });

    it('should derive different shared keys from two different key pairs', async () => {
      const keyPair1 = await generateKeyPair('P-256');
      const keyPair2 = await generateKeyPair('P-256');
      const keyPair3 = await generateKeyPair('P-256');

      const sharedKey1 = await deriveKey(keyPair1.publicKey, keyPair3.privateKey);
      const sharedKey2 = await deriveKey(keyPair2.publicKey, keyPair1.privateKey);

      expect(await sharedKeyIsMatched(sharedKey1, sharedKey2)).toBeFalsy();
    });
  });

  describe('#importPublicKey', () => {
    it('should reject invalid input', async () => {
      const invalidPublicKey = 'InvalidPublicKeyData';
      await expect(importPublicKey(invalidPublicKey, 'P-256')).rejects.toBeTruthy();
    });
  });

  it('should import a public key from exported by exportPublicKey', async () => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      ['deriveKey']
    );
    const publicKey = await exportPublicKey(keyPair.publicKey);

    const importedKey = await importPublicKey(bytesToBase64(new Uint8Array(publicKey)), 'P-256');

    expect(importedKey).toBeInstanceOf(CryptoKey);
  });
});
