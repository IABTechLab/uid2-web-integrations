import * as mocks from "../mocks";
import { ClientSideIdentityOptions } from "../uid2ClientSideIdentityOptions";
import { sdkWindow, UID2 } from "../uid2Sdk";

let callback: any;
let uid2: UID2;
let xhrMock: any;
let _cryptoMock;

const clientSideOpt: ClientSideIdentityOptions = {
  serverPublicKey:
    "UID2-X-L-24B8a/eLYBmRkXA9yPgRZt+ouKbXewG2OPs23+ov3JC8mtYJBCx6AxGwJ4MlwUcguebhdDp2CvzsCgS9ogwwGA==",
  subscriptionId: "subscription-id",
};

mocks.setupFakeTime();

beforeEach(() => {
  callback = jest.fn();
  uid2 = new UID2();
  xhrMock = new mocks.XhrMock(sdkWindow);
  _cryptoMock = new mocks.CryptoMock(sdkWindow);
  mocks.setCookieMock(sdkWindow.document);
  removeUid2LocalStorage();
});

afterEach(() => {
  mocks.resetFakeTime();
});

const getUid2LocalStorage = mocks.getUid2LocalStorage;
const removeUid2LocalStorage = mocks.removeUid2LocalStorage;

describe.only("Using Client-side token generation", () => {
  let scenarios = [
    {
      validIdentity: "test@example.com",
      invalidIdentity: "test.com",
      setIdentityFn: "setIdentityFromEmail",
    },
    {
      identity: "lz3+Rj7IV4X1+Vr1ujkG7tstkxwk5pgkqJ6mXbpOgTs=",
      invalidIdentity: "test@example.com",
      setIdentity: "setIdentityFromEmailHash",
    },
    {
      identity: "+12345678910",
      invalidIdentity: "12345678910",
      setIdentity: "setIdentityFromPhone",
    },
    {
      identity: "kVJ+4ilhrqm3HZDDnCQy4niZknvCoM4MkoVzZrQSdJw=",
      invalidIdentity: "+12345678910",
      setIdentity: "setIdentityFromPhoneHash",
    },
  ];

  scenarios.forEach((scenario) => {
    describe(scenario.setIdentity!, () => {
      describe("When invalid identity is provided", () => {
        test("should throw error and not generate UID2", () => {});
      });

      describe("When valid identity is provided", () => {
        describe("when call cstg API succeeds", () => {
          test("should invoke the callback", () => {});
          test("should set identity to storage", () => {});
          test("should auto refresh token once token expired", () => {});
          test("should be in available state", () => {});
        });

        describe("when call cstg API failed", () => {
          test("should not set identity", () => {});
        });
      });
    });
  });
});
