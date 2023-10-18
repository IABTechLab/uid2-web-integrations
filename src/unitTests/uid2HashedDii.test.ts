import { bytesToBase64 } from "../uid2Base64";
import { isBase64Hash } from "../uid2HashedDii";

describe("#isBase64Hash tests", () => {
  it("should return true for a valid base64 hash", async () => {
    const hash = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("test value")
    );
    const validBase64Hash = bytesToBase64(new Uint8Array(hash));
    expect(isBase64Hash(validBase64Hash)).toBe(true);
  });

  it("should return false for an empty string", () => {
    const emptyString = "";
    expect(isBase64Hash(emptyString)).toBe(false);
  });

  it("should return false for a string with a length other than 44", () => {
    const shortString = "c29tZSBkYXRhIGluIFVJRDIAAAAAAAB";
    const longString = "c29tZSBkYXRhIGluIFVJRDIAAAAAAABjbGllbnRTaWduZWQ==extra";

    expect(isBase64Hash(shortString)).toBe(false);
    expect(isBase64Hash(longString)).toBe(false);
  });

  it("should return false for an invalid base64 hash", () => {
    const invalidBase64 = "ThisIsNotBase64";
    expect(isBase64Hash(invalidBase64)).toBe(false);
  });
});
