import { UID2 } from "./uid2Sdk";
import { EventType } from "./uid2CallbackManager";

export class Uid2SecureSignalHandler {
  constructor(uid2Sdk: UID2) {
    uid2Sdk.callbacks.push(this._handleEvent.bind(this));
  }

  private _handleEvent(eventType: EventType) {
    if (eventType === EventType.InitCompleted ||
        eventType === EventType.IdentityUpdated) {
      window.__uid2Esp?.registerSecureSignalProvider()
    }
  }
}