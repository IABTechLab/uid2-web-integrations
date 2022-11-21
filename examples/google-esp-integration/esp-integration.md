# UID2 ESP Integration 

Google ESP is a way for publishers to pass "encrypted" user IDs to google-approved bidders via Google AdManager (GAM) and Adx network. The framework is an optional part of Google PlayTag (GPT) library commonly used by publishers.

The framework allows publishers push user id signals, have them cached on the client side and transparently passed over to GAM which would then forward them over to approved bidders within Adx based on publisher's preferences.

## Allow secure signal sharing

For your GAM account to be eligible for receiving encrypted UIDs, you must make sure encrypted signals are properly shared with third party bidders on your GAM account. Follow Google’s article [Share encrypted signals with bidders](https://support.google.com/admanager/answer/10488752) and Publisher Onboarding Workflow.

## Publisher Integrations

Once a encrypted signal is cached, ESP does not execute the hanlder to generate new singal, thus it is necessary to clear the cache before login and after logout. Since ESP does not provide a way to delete/invalidate a specific id, publishers to need to call `window.googletag.encryptedSignalProviders.clearAllCache()` to clear all shared encrypted signals as part of their login/logout workflows.

### Server-Only Integration

In order to share encrypted signals, the hosted auto-loaded ESP script should be able to make a call to `window.getAdvertisingToken` which will return `advertising_token` as a string. 

For example:
```
    window.getAdvertisingToken = () => {
      const uid2Token = getCookie('identity')
      if (uid2Token === "") return
      return JSON.parse(decodeURIComponent(uid2Token)).advertising_token
    }
```

Make sure `window.getAdvertisingToken` only returns a valid token or null, as this will be cached by GPT for 24 hours.

Publishers could as make call to `window.__uid2Esp.sendSignal` to force a push of encrypted signal as part of their login workflow.

### UID2 SDK Integration

For publishers that utilize the Client-Side Identity JavaScript SDK(UID2 SDK), it only requires enable ESP during the initialization, the SDK will resigster a callback to push UID to GPT when identity is updated

For example:
```
 __uid2.init({
   enableESP : true
 });
```
