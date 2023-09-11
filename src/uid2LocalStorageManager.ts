import { isValidIdentity, Uid2Identity } from "./Uid2Identity";

export class UID2LocalStorageManager {
  public setValue(identity: Uid2Identity) {
    const value = JSON.stringify(identity);
    localStorage.setItem("identity", value);
  }
  public removeValue() {
    localStorage.removeItem("identity");
  }
  private getValue() {
    return localStorage.getItem("identity");
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
