import { isOptoutIdentity, isValidIdentity, OptoutIdentity, Identity } from './Identity';

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
  private getValue() {
    return localStorage.getItem(this._storageKey);
  }

  public loadIdentityFromLocalStorage(): Identity | OptoutIdentity | null {
    const payload = this.getValue();
    if (payload) {
      const result = JSON.parse(payload) as unknown;
      if (isValidIdentity(result)) return result;
      if (isOptoutIdentity(result)) return result;
    }
    return null;
  }
}
