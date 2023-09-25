import { isValidIdentity, Uid2Identity } from "./Uid2Identity";

export const localStorageKeyName = 'UID2-sdk-identity'

export class UID2LocalStorageManager {
  public setValue(identity: Uid2Identity) {
    const value = JSON.stringify(identity);
    localStorage.setItem(localStorageKeyName, value);
  }
  public removeValue() {
    localStorage.removeItem(localStorageKeyName);
  }
  public getValue() {
    return localStorage.getItem(localStorageKeyName);
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
