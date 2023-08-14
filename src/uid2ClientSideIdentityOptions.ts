export type ClientSideIdentityOptions = {
  readonly serverPublicKey: string;
  readonly subscriptionId: string;
};

export function isClientSideIdentityOptionsOrThrow(
  maybeOpts: any
): maybeOpts is ClientSideIdentityOptions {
  if (typeof maybeOpts !== "object" || maybeOpts === null) {
    throw new TypeError("opts must be an object");
  }

  const opts = maybeOpts as ClientSideIdentityOptions;
  if (typeof opts.serverPublicKey !== "string") {
    throw new TypeError("opts.serverPublicKey must be a string");
  }
  if (opts.serverPublicKey.length === 0) {
    throw new TypeError("opts.serverPublicKey is empty");
  }
  // We don't do any further validation of the public key, as we will find out
  // later if it's valid by using importKey.

  if (typeof opts.subscriptionId !== "string") {
    throw new TypeError("opts.subscriptionId must be a string");
  }
  if (opts.subscriptionId.length === 0) {
    throw new TypeError("opts.subscriptionId is empty");
  }

  return true;
}
