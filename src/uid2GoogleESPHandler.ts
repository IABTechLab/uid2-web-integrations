import { UID2 } from "./uid2Sdk";
import { EventType, Uid2CallbackPayload } from "./uid2CallbackManager";

export class UID2GoogleESPHandler {
  constructor(uid2Sdk: UID2) {
    uid2Sdk.callbacks.push(this._handleEvent.bind(this));
  }

  private _handleEvent(eventType: EventType, payload: Uid2CallbackPayload) {
    if (
      (eventType === EventType.InitCompleted ||
        eventType === EventType.IdentityUpdated) &&
      payload.identity
    ) {
      window.__uid2Esp.sendSignal()
    }
  }
}