import { isOptoutIdentity, isValidIdentity, OptoutIdentity, Identity } from './Identity';

export function loadIdentityWithStorageKey(storageKey: string): Identity | OptoutIdentity | null {
  const payload = getValue(storageKey);
  if (payload) {
    const result = JSON.parse(payload) as unknown;
    if (isValidIdentity(result)) return result;
    if (isOptoutIdentity(result)) return result;
  }
  return null;
}

function getValue(storageKey: string) {
  return localStorage.getItem(storageKey);
}

export class LocalStorageManager {
  private _storageKey: string;
  constructor(storageKey: string) {
    this._storageKey = storageKey;
  }
  public setValue(identity: Identity | OptoutIdentity) {
    const value = JSON.stringify(identity);
    localStorage.setItem(this._storageKey, value);
  }
  public removeValue() {
    localStorage.removeItem(this._storageKey);
  }

  public loadIdentityFromLocalStorage(): Identity | OptoutIdentity | null {
    return loadIdentityWithStorageKey(this._storageKey);
  }
}
