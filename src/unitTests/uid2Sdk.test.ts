import { makeUid2CstgOption } from '../mocks';
import { isClientSideIdentityOptionsOrThrow } from '../clientSideIdentityOptions';
import { UID2 } from '../uid2Sdk';

let uid2: UID2;

describe('#uid2Sdk', () => {
  describe('CSTG Set Identity Tests', () => {
    beforeEach(() => {
      uid2 = new UID2();
    });

    describe('When setIdentity is called before init', () => {
      test('should throw init not complete error', async () => {
        try {
          await uid2.setIdentityFromEmail('test@123.com', makeUid2CstgOption());
          fail('Expected an error to be thrown');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(Error);
        }
      });
    });
  });

  describe('#isClientSideIdentityOptionsOrThrow', () => {
    test('should throw opts must be an object error when config is not object', () => {
      expect(() => isClientSideIdentityOptionsOrThrow('', 'UID2')).toThrow(
        'opts must be an object'
      );
    });
    test('should throw serverPublicKey must be a string error when serverPublicKey is not a string', () => {
      expect(() =>
        isClientSideIdentityOptionsOrThrow(makeUid2CstgOption({ serverPublicKey: {} }), 'UID2')
      ).toThrow('opts.serverPublicKey must be a string');
    });
    test('should throw serverPublicKey prefix when serverPublicKey is invalid', () => {
      expect(() =>
        isClientSideIdentityOptionsOrThrow(
          makeUid2CstgOption({ serverPublicKey: 'test-server-public-key' }),
          'UID2'
        )
      ).toThrow('opts.serverPublicKey must match the regular expression /^UID2-X-[A-Z]-.+/');
    });
    test('should throw serverPublicKey prefix (EUID) when serverPublicKey is invalid', () => {
      expect(() =>
        isClientSideIdentityOptionsOrThrow(
          makeUid2CstgOption({ serverPublicKey: 'test-server-public-key' }),
          'EUID'
        )
      ).toThrow('opts.serverPublicKey must match the regular expression /^EUID-X-[A-Z]-.+/');
    });
    test('should throw subscriptionId must be a string error when subscriptionId is not a string', () => {
      expect(() =>
        isClientSideIdentityOptionsOrThrow(makeUid2CstgOption({ subscriptionId: {} }), 'UID2')
      ).toThrow('opts.subscriptionId must be a string');
    });
    test('should throw subscriptionId is empty error when subscriptionId is not given', () => {
      expect(() =>
        isClientSideIdentityOptionsOrThrow(makeUid2CstgOption({ subscriptionId: '' }), 'UID2')
      ).toThrow('opts.subscriptionId is empty');
    });
    test('should succeed when given a valid object', () => {
      expect(isClientSideIdentityOptionsOrThrow(makeUid2CstgOption())).toBe(true);
    });
  });
});
