import { UID2 } from "./uid2Sdk";
import { EventType, Uid2CallbackPayload } from "./uid2CallbackManager";

export class Uid2SecureSignalHandler {
  constructor(uid2Sdk: UID2) {
    uid2Sdk.callbacks.push(this._handleEvent.bind(this));
    // If esp script loaded before SDK, force a refresh to trigger IdentityUpdated
    if (window.__uid2Esp && window.__uid2Esp.isCacheExpired()) {
      uid2Sdk.forceTokenRefresh()
    }
  }

  private _handleEvent(eventType: EventType, payload: Uid2CallbackPayload) {
    console.log(eventType, payload)
    if (eventType === EventType.IdentityUpdated) {
      console.log(payload)
      window.__uid2Esp?.registerSecureSignalProvider(payload.identity?.advertising_token)
    }
  }
}