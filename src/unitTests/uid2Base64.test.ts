import { base64ToBytes, bytesToBase64 } from "../uid2Base64";

describe("uid2Base64 tests", () => {
  describe("#bytesToBase64", () => {
    it("should convert bytes to base64", () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const base64 = bytesToBase64(bytes);
      expect(base64).toBe("SGVsbG8=");
    });

    it("should handle an empty input", () => {
      const bytes = new Uint8Array([]);
      const base64 = bytesToBase64(bytes);
      expect(base64).toBe("");
    });
  });

  describe("#base64ToBytes", () => {
    it("should convert base64 to bytes", () => {
      const base64 = "SGVsbG8=";
      const bytes = base64ToBytes(base64);
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
    });

    it("should handle an empty input", () => {
      const base64 = "";
      const bytes = base64ToBytes(base64);
      expect(Array.from(bytes)).toEqual([]);
    });
  });

  it("should convert a base64 string to bytes and back", () => {
    const originalBase64 = "SGVsbG8gV29ybGQh";
    const bytes = base64ToBytes(originalBase64);
    const convertedBase64 = bytesToBase64(bytes);

    expect(convertedBase64).toEqual(originalBase64);
  });
});
