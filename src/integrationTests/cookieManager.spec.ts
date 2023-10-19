import { describe, expect, test } from '@jest/globals';

import { isLegacyCookie } from '../uid2CookieManager';

const testCases = [
  {
    desc: `valid object`,
    expectedValid: true,
    data: {
      advertising_token: 'abc',
      refresh_token: 'def',
    },
  },
  { desc: 'empty object ', expectedValid: false, data: {} },
  { desc: 'null', expectedValid: false, data: null },
  { desc: 'undefined', expectedValid: false, data: undefined },
  {
    desc: 'empty token strings object',
    expectedValid: false,
    data: { advertising_token: '', refresh_token: '' },
  },
  {
    desc: 'null tokens object',
    expectedValid: false,
    data: { advertising_token: null, refresh_token: null },
  },
  {
    desc: 'undefined tokens object',
    expectedValid: false,
    data: { advertising_token: undefined, refresh_token: null },
  },
];

describe('When validating a legacy cookie,', () => {
  test.each(testCases)('$desc results in $expectedValid', ({ expectedValid, data }) => {
    const result = isLegacyCookie(data);
    expect(result).toBe(expectedValid);
  });
});
