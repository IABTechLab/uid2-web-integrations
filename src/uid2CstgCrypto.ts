import { base64ToBytes } from './uid2Base64';

export function generateKeyPair(namedCurve: NamedCurve): Promise<CryptoKeyPair> {
  const params: EcKeyGenParams = {
    name: 'ECDH',
    namedCurve: namedCurve,
  };
  return window.crypto.subtle.generateKey(params, false, ['deriveKey']);
}

export function importPublicKey(publicKey: string, namedCurve: NamedCurve): Promise<CryptoKey> {
  const params: EcKeyGenParams = {
    name: 'ECDH',
    namedCurve: namedCurve,
  };
  return window.crypto.subtle.importKey('spki', base64ToBytes(publicKey), params, false, []);
}

export function exportPublicKey(publicKey: CryptoKey): Promise<ArrayBuffer> {
  return window.crypto.subtle.exportKey('spki', publicKey);
}

export function deriveKey(
  serverPublicKey: CryptoKey,
  clientPrivateKey: CryptoKey
): Promise<CryptoKey> {
  return window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: serverPublicKey,
    },
    clientPrivateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export function encrypt(
  data: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array,
  additionalData: Uint8Array
): Promise<ArrayBuffer> {
  return window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      additionalData: additionalData,
    },
    key,
    data
  );
}

export function decrypt(data: Uint8Array, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
  return window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );
}
