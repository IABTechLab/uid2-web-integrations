import { bytesToBase64 } from "../uid2Base64";
import { UID2CstgBox } from "../uid2CstgBox";

describe("UID2CstgBox", () => {
  it("should be able to encrypt and decrypt data", async () => {
    const serverPublicKey = bytesToBase64(
      new TextEncoder().encode("test-public-key")
    );
    const cstgBox = await UID2CstgBox.build(serverPublicKey);

    const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
    const additionalData = new Uint8Array([6, 7, 8]);

    const { iv, ciphertext } = await cstgBox.encrypt(plaintext, additionalData);
    const decryptedData = await cstgBox.decrypt(iv, new Uint8Array(ciphertext));

    expect(decryptedData).toEqual(plaintext.buffer);
  });

  it("should have a clientPublicKey property", async () => {
    const serverPublicKey = bytesToBase64(
      new TextEncoder().encode("test-public-key")
    );
    const cstgBox = await UID2CstgBox.build(serverPublicKey);

    expect(cstgBox.clientPublicKey).toBeInstanceOf(CryptoKey);
  });
});
