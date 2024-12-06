expect.extend({
  toBeNonEmptyString(received) {
    expect(typeof received).toBe('string');
    expect(received).not.toEqual('');
    return {
      pass: true,
      message: () => 'Expected non-empty string',
    };
  },
});

expect.extend({
  toBeInAvailableState(uid2, expectedAdvertisingToken) {
    if (expectedAdvertisingToken) {
      expect(uid2.getAdvertisingToken()).toBe(expectedAdvertisingToken);
    } else if (uid2.getAdvertisingToken() !== '') {
      expect(uid2.getAdvertisingToken()).toBeNonEmptyString();
    }

    expect(uid2.noIdentityAvailable()).toEqual(false);

    return {
      pass: true,
      message: () =>
        'Expected getAdvertisingToken() returns a token and noIdentityAvailable() returns false',
    };
  },

  toBeInTemporarilyUnavailableState(uid2) {
    expect(uid2.getAdvertisingToken()).toBeUndefined();
    expect(uid2.noIdentityAvailable()).toEqual(false);

    return {
      pass: true,
      message: () =>
        'Expected getAdvertisingToken() returns undefined and noIdentityAvailable() returns false',
    };
  },

  toBeInUnavailableState(uid2) {
    expect(uid2.getAdvertisingToken()).toBeUndefined();
    expect(uid2.noIdentityAvailable()).toEqual(true);
    expect(uid2.hasOptedOut()).toEqual(false);

    return {
      pass: true,
      message: () =>
        'Expected getAdvertisingToken() returns undefined and noIdentityAvailable() returns true',
    };
  },

  toBeInOptoutState(uid2) {
    expect(uid2.getAdvertisingToken()).toBeUndefined();
    expect(uid2.noIdentityAvailable()).toEqual(false);
    expect(uid2.hasOptedOut()).toEqual(true);

    return {
      pass: true,
      message: () =>
        'Expected getAdvertisingToken() returns undefined and noIdentityAvailable() returns false',
    };
  },
});
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

Object.defineProperty(window, 'crypto', {
  get() {
    return require('crypto');
  },
});
