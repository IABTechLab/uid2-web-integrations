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
export type Identity = IdentityV1 | IdentityV2;
export function isValidIdentity(identity: Identity | unknown): identity is Identity {
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
export interface OptoutIdentity extends Pick<Identity, 'refresh_expires' | 'identity_expires'> {
  status: 'optout';
}
export function isOptoutIdentity(identity: OptoutIdentity | unknown): identity is OptoutIdentity {
  if (identity === null || typeof identity !== 'object') return false;
  const maybeIdentity = identity as OptoutIdentity;
  return maybeIdentity.status === 'optout';
}
