import { UID2 } from "./uid2Sdk";
import { EventType, Uid2CallbackPayload } from "./uid2CallbackManager";

export class Uid2SecureSignalHandler {
  constructor(uid2Sdk: UID2) {
    uid2Sdk.callbacks.push(this._handleEvent.bind(this));
  }

  private _isIdentityNeedRefresh(payload: Uid2CallbackPayload) {
    return (
      "identity" in payload &&
      payload.identity &&
      payload.identity.refresh_from < Date.now()
    );
  }

  private _handleEvent(eventType: EventType, payload: Uid2CallbackPayload) {
    if (
      (eventType === EventType.InitCompleted &&
        !this._isIdentityNeedRefresh(payload)) ||
      eventType === EventType.IdentityUpdated
    ) {
      window.__uid2SecureSignalProvider?.registerSecureSignalProvider();
    }
  }
}