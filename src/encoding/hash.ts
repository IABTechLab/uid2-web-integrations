import { bytesToBase64 } from './base64';

export async function hashAndEncodeIdentifier(value: string) {
  const hash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(hash));
}
