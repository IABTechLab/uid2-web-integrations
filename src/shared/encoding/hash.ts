import { bytesToBase64 } from './base64';

export async function hashAndEncodeIdentifier(value: string) {
  const hash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(hash));
}

export async function hashIdentifier(value: string) {
  const hash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  // converting 32-byte SHA-256 to hex-encoded representation
  return [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
