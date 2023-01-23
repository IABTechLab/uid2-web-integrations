# UID2 Secure Signal Integration

Google Secure Signal is a way for publishers to pass "encrypted" user IDs to google-approved bidders via Google AdManager (GAM) and Adx network. The framework is an optional part of Google PlayTag (GPT) library commonly used by publishers.

The framework allows publishers push user id signals, have them cached on the client side and transparently passed over to GAM which would then forward them over to approved bidders within Adx based on publisher's preferences.

## Allow secure signal sharing

For your GAM account to be eligible for receiving encrypted UIDs, you must make sure encrypted signals are properly shared with third party bidders on your GAM account. Follow Google’s article [Share encrypted signals with bidders](https://support.google.com/admanager/answer/10488752) and Publisher Onboarding Workflow.

## Publisher Integrations

Once a encrypted signal is cached, Secure Signal does not execute the hanlder to generate new singal, thus it is necessary to clear the cache before login and after logout. Since Secure Signal does not provide a way to delete/invalidate a specific id, publishers to need to call `window.googletag.secureSignalProviders.clearAllCache()` to clear all shared encrypted signals as part of their login/logout workflows.

### Server-Only Integration

In order to share encrypted signals, the hosted auto-loaded Secure Signal script should be able to make a call to async function `window.getUid2AdvertisingToken` and receive `advertising_token` as a string.

For example:

```
    window.getUid2AdvertisingToken = async () => {
      // Make a call to get a fresh identity which could last for at least 12 hrs
      const identity = await getFreshIdentity
      return JSON.parse(decodeURIComponent(identity)).advertising_token
    }
```

### UID2 SDK Integration

For publishers that utilize the Client-Side Identity JavaScript SDK(UID2 SDK) version 3.0.0 onwards, the hosted auto-loaded UID2 Secure Signal script will get the fresh advertising token by using the `getAdvertisingTokenAsync` function provided in SDK, and push the token to GAM
