import { isValidIdentity, Uid2Identity } from "./Uid2Identity";

export class UID2LocalStorageManager {
  public setValue(identity: Uid2Identity) {
    const value = JSON.stringify(identity);
    localStorage.setItem("UID2-identity", value);
  }
  public removeValue() {
    localStorage.removeItem("UID2-identity");
  }
  private getValue() {
    return localStorage.getItem("UID2-identity");
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
