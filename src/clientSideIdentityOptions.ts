import { ProductName } from './product';

export type ClientSideIdentityOptions = {
  readonly serverPublicKey: string;
  readonly subscriptionId: string;
};

const SERVER_PUBLIC_KEY_PREFIX_LENGTH = 9;

export function stripPublicKeyPrefix(serverPublicKey: string) {
  return serverPublicKey.substring(SERVER_PUBLIC_KEY_PREFIX_LENGTH);
}

export function isClientSideIdentityOptionsOrThrow(
  maybeOpts: any,
  product: ProductName
): maybeOpts is ClientSideIdentityOptions {
  if (typeof maybeOpts !== 'object' || maybeOpts === null) {
    throw new TypeError('opts must be an object');
  }

  const opts = maybeOpts as ClientSideIdentityOptions;
  if (typeof opts.serverPublicKey !== 'string') {
    throw new TypeError('opts.serverPublicKey must be a string');
  }
  const serverPublicKeyPrefix = new RegExp(`^${product}-X-[A-Z]-.+`);
  if (!serverPublicKeyPrefix.test(opts.serverPublicKey)) {
    throw new TypeError(
      `opts.serverPublicKey must match the regular expression ${serverPublicKeyPrefix}`
    );
  }
  // We don't do any further validation of the public key, as we will find out
  // later if it's valid by using importKey.

  if (typeof opts.subscriptionId !== 'string') {
    throw new TypeError('opts.subscriptionId must be a string');
  }
  if (opts.subscriptionId.length === 0) {
    throw new TypeError('opts.subscriptionId is empty');
  }

  return true;
}
