import { isNormalizedPhone, normalizeEmail } from "../uid2DiiNormalization";

describe("DiiNormalization Tests", () => {
  describe("#isNormalizedPhone", () => {
    test("should return false when phone number is not normalized", () => {
      const testCases = [
        "",
        "asdaksjdakfj",
        "DH5qQFhi5ALrdqcPiib8cy0Hwykx6frpqxWCkR0uijs",
        "QFhi5ALrdqcPiib8cy0Hwykx6frpqxWCkR0uijs",
        "06a418f467a14e1631a317b107548a1039d26f12ea45301ab14e7684b36ede58",
        "0C7E6A405862E402EB76A70F8A26FC732D07C32931E9FAE9AB1582911D2E8A3B",
        "+",
        "12345678",
        "123456789",
        "1234567890",
        "+12345678",
        "+123456789",
        "+ 12345678",
        "+ 123456789",
        "+ 1234 5678",
        "+ 1234 56789",
        "+1234567890123456",
        "+1234567890A",
        "+1234567890 ",
        "+1234567890+",
        "+12345+67890",
        "555-555-5555",
        "(555) 555-5555",
      ];

      testCases.forEach((testCase) =>
        expect(isNormalizedPhone(testCase)).toBeFalsy()
      );
    });

    test("should return true when phone number is normalized", () => {
      const testCases = [
        "+1234567890",
        "+12345678901",
        "+123456789012",
        "+1234567890123",
        "+12345678901234",
        "+123456789012345",
      ];
      testCases.forEach((testCase) =>
        expect(isNormalizedPhone(testCase)).toBeTruthy()
      );
    });
  });

  describe("#normalizeEmail", () => {
    test("should return undefined if email is invalid", () => {
      const testCases = [
        "",
        " @",
        "@",
        "a@",
        "@b",
        "@b.com",
        "+",
        " ",
        "+@gmail.com",
        ".+@gmail.com",
        "a@ba@z.com",
      ];

      testCases.forEach((testCase) =>
        expect(normalizeEmail(testCase)).toBeUndefined()
      );
    });

    test("should return undefined if email has space in between", () => {
      const testCases = [
        "test test@test.com",
        "test@te st.com",
        "test test@gmail.com",
      ];

      testCases.forEach((testCase) =>
        expect(normalizeEmail(testCase)).toBeUndefined()
      );
    });

    test("should normalized valid email", () => {
      const testCases = [
        {
          originalEmail: "TEst.TEST@Test.com ",
          normalizedEmail: "test.test@test.com",
        },
        {
          originalEmail: "test.test@test.com",
          normalizedEmail: "test.test@test.com",
        },
        {
          originalEmail: "test+test@test.com",
          normalizedEmail: "test+test@test.com",
        },
        { originalEmail: "+test@test.com", normalizedEmail: "+test@test.com" },
        {
          originalEmail: "testtest@test.com",
          normalizedEmail: "testtest@test.com",
        },
        {
          originalEmail: " testtest@test.com",
          normalizedEmail: "testtest@test.com",
        },
        {
          originalEmail: "testtest@test.com ",
          normalizedEmail: "testtest@test.com",
        },
        {
          originalEmail: " testtest@test.com ",
          normalizedEmail: "testtest@test.com",
        },
        {
          originalEmail: "  testtest@test.com  ",
          normalizedEmail: "testtest@test.com",
        },
        {
          originalEmail: "TEst.TEST@Test.com ",
          normalizedEmail: "test.test@test.com",
        },
        {
          originalEmail: "TEst.TEST@Test.com ",
          normalizedEmail: "test.test@test.com",
        },
      ];

      testCases.forEach((testCase) =>
        expect(normalizeEmail(testCase.originalEmail)).toEqual(
          testCase.normalizedEmail
        )
      );
    });

    describe("it should be able to normalized gmail", () => {
      test("it should drop extension in gmail", () => {
        const testCases = [
          {
            originalEmail: "test+test@gmail.com",
            normalizedEmail: "test@gmail.com",
          },
          {
            originalEmail: "TEst.TEst+123@GMail.Com",
            normalizedEmail: "testtest@gmail.com",
          },
        ];
        testCases.forEach((testCase) =>
          expect(normalizeEmail(testCase.originalEmail)).toEqual(
            testCase.normalizedEmail
          )
        );
      });

      test("it should remove dot from gmail", () => {
        const testCases = [
          {
            originalEmail: "test.test@gmail.com",
            normalizedEmail: "testtest@gmail.com",
          },
          {
            originalEmail: " test.test@gmail.com",
            normalizedEmail: "testtest@gmail.com",
          },
          {
            originalEmail: "test.test@gmail.com ",
            normalizedEmail: "testtest@gmail.com",
          },
          {
            originalEmail: " test.test@gmail.com ",
            normalizedEmail: "testtest@gmail.com",
          },
          {
            originalEmail: "  test.test@gmail.com  ",
            normalizedEmail: "testtest@gmail.com",
          },
          {
            originalEmail: "TEstTEst@gmail.com  ",
            normalizedEmail: "testtest@gmail.com",
          },
          {
            originalEmail: "TEstTEst@GMail.Com  ",
            normalizedEmail: "testtest@gmail.com",
          },
          {
            originalEmail: " TEstTEst@GMail.Com  ",
            normalizedEmail: "testtest@gmail.com",
          },
          {
            originalEmail: "TEstTEst@GMail.Com",
            normalizedEmail: "testtest@gmail.com",
          },
        ];
        testCases.forEach((testCase) =>
          expect(normalizeEmail(testCase.originalEmail)).toEqual(
            testCase.normalizedEmail
          )
        );
      });
    });

    test("should keep unicode character in email", () => {
      const testCases = [
        {
          originalEmail: "\uD83D\uDE0Atesttest@test.com",
          normalizedEmail: "\uD83D\uDE0Atesttest@test.com",
        },
        {
          originalEmail: "testtest@\uD83D\uDE0Atest.com",
          normalizedEmail: "testtest@\uD83D\uDE0Atest.com",
        },
        {
          originalEmail: "testtest@test.com\uD83D\uDE0A",
          normalizedEmail: "testtest@test.com\uD83D\uDE0A",
        },
      ];

      testCases.forEach((testCase) =>
        expect(normalizeEmail(testCase.originalEmail)).toEqual(
          testCase.normalizedEmail
        )
      );
    });
  });
});
