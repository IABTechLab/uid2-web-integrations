import { isValidIdentity, Uid2Identity } from './Uid2Identity';

export class UID2LocalStorageManager {
  private _storageKey: string;
  constructor(storageKey: string) {
    this._storageKey = storageKey;
  }
  public setValue(identity: Uid2Identity) {
    const value = JSON.stringify(identity);
    localStorage.setItem(this._storageKey, value);
  }
  public removeValue() {
    localStorage.removeItem(this._storageKey);
  }
  private getValue() {
    return localStorage.getItem(this._storageKey);
  }

  public loadIdentityFromLocalStorage(): Uid2Identity | null {
    const payload = this.getValue();
    if (payload) {
      const result = JSON.parse(payload) as unknown;
      if (isValidIdentity(result)) return result;
    }
    return null;
  }
}
