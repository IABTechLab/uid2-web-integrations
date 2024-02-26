export type Base64Hash = string;

export function isBase64Hash(value: string): value is Base64Hash {
  if (!(value && value.length === 44)) {
    return false;
  }

  try {
    return btoa(atob(value)) === value;
  } catch (err) {
    return false;
  }
}
