import {
  decrypt,
  deriveKey,
  encrypt,
  exportPublicKey,
  generateKeyPair,
  importPublicKey,
} from './uid2CstgCrypto';

export class UID2CstgBox {
  private static readonly _namedCurve = 'P-256';

  private readonly _clientPublicKey: CryptoKey;
  private readonly _sharedKey: CryptoKey;

  private constructor(clientPublicKey: CryptoKey, sharedKey: CryptoKey) {
    this._clientPublicKey = clientPublicKey;
    this._sharedKey = sharedKey;
  }

  public static async build(serverPublicKey: string): Promise<UID2CstgBox> {
    const clientKeyPair = await generateKeyPair(UID2CstgBox._namedCurve);
    const importedServerPublicKey = await importPublicKey(serverPublicKey, this._namedCurve);
    const sharedKey = await deriveKey(importedServerPublicKey, clientKeyPair.privateKey);
    return new UID2CstgBox(clientKeyPair.publicKey, sharedKey);
  }

  public async encrypt(
    plaintext: Uint8Array,
    additionalData: Uint8Array
  ): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await encrypt(plaintext, this._sharedKey, iv, additionalData);
    return {
      iv: iv,
      ciphertext: ciphertext,
    };
  }

  public async decrypt(iv: Uint8Array, ciphertext: Uint8Array): Promise<ArrayBuffer> {
    return await decrypt(ciphertext, this._sharedKey, iv);
  }

  public async getClientPublicKey(): Promise<ArrayBuffer> {
    return exportPublicKey(this._clientPublicKey);
  }
}
