import {
  decrypt,
  deriveKey,
  encrypt,
  exportPublicKey,
  generateKeyPair,
  importPublicKey,
} from "../uid2CstgCrypto";

describe("uid2CstgCrypto Tests", () => {
  let keyPair: CryptoKeyPair;
  let publicKey: CryptoKey;
  let privateKey: CryptoKey;

  beforeAll(async () => {
    keyPair = await generateKeyPair("P-256");
    publicKey = keyPair.publicKey;
    privateKey = keyPair.privateKey;
  });

  it("should import and export a public key correctly", async () => {
    const exportedPublicKey = await exportPublicKey(publicKey);

    const importedPublicKey = await importPublicKey(
      new TextDecoder().decode(new Uint8Array(exportedPublicKey)),
      "P-256"
    );

    expect(importedPublicKey).toEqual(publicKey);
  });

  it("should derive a key correctly", async () => {
    const derivedKey = await deriveKey(publicKey, privateKey);

    expect(derivedKey).toBeInstanceOf(CryptoKey);
  });

  it("should encrypt and decrypt data correctly", async () => {
    const aesKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 128 },
      true,
      ["encrypt", "decrypt"]
    );

    const plaintext = new TextEncoder().encode("This is a secret message");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const additionalData = new TextEncoder().encode("Additional data");

    const ciphertext = await encrypt(plaintext, publicKey, iv, additionalData);

    const decryptedData = await decrypt(
      new Uint8Array(ciphertext),
      privateKey,
      iv
    );

    expect(new Uint8Array(decryptedData)).toEqual(plaintext);
  });
});
