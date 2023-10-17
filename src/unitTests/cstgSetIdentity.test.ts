import { makeCstgOption } from "../mocks";
import { isClientSideIdentityOptionsOrThrow } from "../uid2ClientSideIdentityOptions";
import { UID2 } from "../uid2Sdk";

let uid2: UID2;

describe("CSTG Set Identity Tests", () => {
  beforeEach(() => {
    uid2 = new UID2();
  });

  describe("When setIdentity is called before init", () => {
    test("should throw init not complete error", async () => {
      try {
        await uid2.setIdentityFromEmail("test@123.com", makeCstgOption());
        fail("Expected an error to be thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(Error);
      }
    });
  });
});

describe("#isClientSideIdentityOptionsOrThrow", () => {
  test("should throw opts must be an object error when config is not object", () => {
    expect(() => isClientSideIdentityOptionsOrThrow("")).toThrow(
      "opts must be an object"
    );
  });
  test("should throw serverPublicKey must be a string error when serverPublicKey is not a string", () => {
    expect(() =>
      isClientSideIdentityOptionsOrThrow(
        makeCstgOption({ serverPublicKey: {} })
      )
    ).toThrow("opts.serverPublicKey must be a string");
  });
  test("should throw serverPublicKey prefix when serverPublicKey is invalid", () => {
    expect(() =>
      isClientSideIdentityOptionsOrThrow(
        makeCstgOption({ serverPublicKey: "test-server-public-key" })
      )
    ).toThrow(
      "opts.serverPublicKey must match the regular expression /^UID2-X-[A-Z]-.+/"
    );
  });
  test("should throw subscriptionId must be a string error when subscriptionId is not a string", () => {
    expect(() =>
      isClientSideIdentityOptionsOrThrow(makeCstgOption({ subscriptionId: {} }))
    ).toThrow("opts.subscriptionId must be a string");
  });
  test("should throw subscriptionId is empty error when subscriptionId is not given", () => {
    expect(() =>
      isClientSideIdentityOptionsOrThrow(makeCstgOption({ subscriptionId: "" }))
    ).toThrow("opts.subscriptionId is empty");
  });
});
