interface IdentityBase {
  advertising_token: string;
  identity_expires: number;
  refresh_from: number;
  refresh_token: string;
  refresh_expires: number;
}
interface IdentityV2 extends IdentityBase {
  // eslint-disable-next-line camelcase
  refresh_response_key: string;
}
interface IdentityV1 extends IdentityBase {
  // eslint-disable-next-line camelcase
  refresh_response_key: never;
}
export type Uid2Identity = IdentityV1 | IdentityV2;
export function isValidIdentity(identity: Uid2Identity | unknown): identity is Uid2Identity {
  return (
    typeof identity === 'object' &&
    identity !== null &&
    'advertising_token' in identity &&
    'identity_expires' in identity &&
    'refresh_from' in identity &&
    'refresh_token' in identity &&
    'refresh_expires' in identity
  );
}
