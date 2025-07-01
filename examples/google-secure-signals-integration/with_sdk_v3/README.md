# UID2 SDK Secure Signals Integration Example

This example demonstrates how a content publisher who is working with [Google Interactive Media Ads(IMA) SDKs](https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side) can use [Google Secure Signal](https://support.google.com/admanager/answer/10488752) and the [UID2 SDK for JavaScript](https://unifiedid.com/docs/sdks/sdk-ref-javascript) to share UID2 directly with bidders, in an implementation that uses this SDK.

For an example application without using the UID2 SDK, see [Server-Side UID2 Integration Example](../server_side/README.md).

> NOTE: Although the server side of the example application is implemented in JavaScript using node.js, it is not a requirement. You can use any technology of your choice and refer to the example application for an illustration of the functionality that needs to be implemented.

## Build and Run the Example Application

### Using the VS Code Debugger

The easiest way to try the example is to do the following:

1. Open this repo in VS Code
1. Create a `.env` file in this folder and populate `UID2_API_KEY` and `UID2_CLIENT_SECRET`:
   ```
   UID2_BASE_URL=http://localhost:8080
   UID2_API_KEY=<your-integ-API-key>
   UID2_CLIENT_SECRET=<your-integ-client-secret>
   AD_TAG_URL=https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/extrernal/adx-test-tag&tfcd=0&npa=0&sz=640x480&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=
   UID2_JS_SDK_URL=http://localhost:9091/uid2-sdk.js
   ```
1. Click the Run and Debug tab or hit `Crtl+Shift+D`
1. Select `Launch Secure Signals (Chrome)` from the configuration dropdown
1. Click `Start Debugging` or hit F5

### Running the Docker commands manually

The other way to try the example is to use the following Docker Build command. First, open this folder in your terminal, then run the following:

```
docker build . -t uid2-secure-signals-standard
docker run -it --rm -p 3000:3000 `
    -e UID2_BASE_URL="https://operator-integ.uidapi.com" `
    -e UID2_API_KEY="<your-integ-API-key>" `
    -e UID2_CLIENT_SECRET="<your-integ-client-secret>" `
    -e AD_TAG_URL="https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/extrernal/adx-test-tag&tfcd=0&npa=0&sz=640x480&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=" `
    -e UID2_JS_SDK_URL="<your-JS-SDK-URL>" `
    uid2-secure-signals-standard
```

The following table lists the environment variables that you must specify to start the application.

| Parameter            | Data Type | Description                                                                                                                                              |
| :------------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UID2_BASE_URL`      | string    | The base URL of the UID2 service. For example:</br>Testing environment: `https://integ.uidapi.com`<br/>Production environment: `https://prod.uidapi.com` |
| `UID2_API_KEY`       | string    | Your UID2 authentication key for the UID2 service specified in `UID2_BASE_URL`.                                                                          |
| `UID2_CLIENT_SECRET` | string    | Your UID2 client secret for the UID2 service specified in `UID2_BASE_URL`.                                                                               |
| `AD_TAG_URL`         | string    | The ad tag URL to test ad requests.                                                                                                                      |
| `UID2_JS_SDK_URL`    | string    | The UID2 JS SDK. If this optional parameter it not provided, it will default to the integ URL specified in `server.js`                                   |

Output similar to the following indicates that the example application is up and running.

```
> uid2-publisher@1.0.0 start /usr/src/app
> node server.js

Example app listening at http://localhost:3000
```

If needed, to close the application, terminate the Docker container or use the `Ctrl+C` keyboard shortcut.

## Test the Example Application

The following table outlines and annotates the steps you can take to test and explore the example application.

| Step | Description                                                                                                                                                                                                                                                | Comments                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| :--: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|  1   | In your browser, navigate to the application main page at `http://localhost:3000`.                                                                                                                                                                         | The displayed main ([index](views/index.html)) page of the example application provides a login form for the user to complete the UID2 login process.</br>IMPORTANT: A real-life application must also display a form for the user to consent to targeted advertising.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|  2   | In the text field at the bottom, enter the email address that you want to use for testing and click **Generate UID2**. Note: The button may be labeled different here as it is a testing environment; in a real production environment, labels may differ. | The click calls the Secure Signal [`clearAllCache()`](https://developers.google.com/publisher-tag/reference#googletag.secureSignals.SecureSignalProvidersArray_clearAllCache) function, to clear all cached signals from local storage, and then calls the `/login` endpoint ([server.js](server.js)). The login initiated on the server side then calls the [POST /token/generate](https://unifiedid.com/docs/endpoints/post-token-generate#decrypted-json-response-format) endpoint and processes the received response.                                                                                                                                                                                                                                                            |
|      | A confirmation message appears with the established UID2 identity information.                                                                                                                                                                             | The displayed identity information is the `body` property of the [JSON response payload](https://unifiedid.com/docs/endpoints/post-token-generate#decrypted-json-response-format) from the `POST /token/generate` response. It has been passed to the `login` [view](views/login.html) for rendering client-side JavaScript. Next, the identity information is passed to the UID2 SDK [`init()`](https://unifiedid.com/docs/sdks/sdk-ref-javascript#initopts-object-void) function. If the identity is valid, the SDK stores it either in local storage or a first-party UID2 cookie (see [UID2 Storage Format](https://unifiedid.com/docs/sdks/sdk-ref-javascript#uid2-storage-format) for use on subsequent page loads.                                                             |
|  3   | Click the **Back to the main page** link.                                                                                                                                                                                                                  | On the updated application main page, note the newly populated **UID2 Advertising Token** value and a video player. While the [page view](views/index.html) is loading, [GPT](https://developers.google.com/publisher-tag/reference#googletag) auto-loads the Secure Signal UID2 script which pushes the advertising token to GPT local storage, and the [IMA](https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side) makes an ad request which transmits the encoded signal in the request. The [page view](views/index.html) calls the [init()](https://unifiedid.com/docs/sdks/sdk-ref-javascript#initopts-object-void) function again, but this time without passing an explicit identity. Instead, the identity is loaded from the first-party cookie. |
|  4   | Click **Play**.                                                                                                                                                                                                                                            | This triggers AdsManager to insert the ad returned from the ad request, for display. The ad tag used in this example contains a 10-second pre-roll ad.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|  5   | Keep the application main page open, or refresh it after a while, and note the UID2 identity state, updated counter, and login information values.                                                                                                         | In the background, the UID2 SDK continuously validates whether the advertising token is up to date, and refreshes it automatically when needed. If the refresh succeeds, the user opts out, or the refresh token expires, the callback function is invoked, and the UI elements are updated with the current state of the UID2 identity. For details, see [Workflow Overview](https://unifiedid.com/docs/sdks/sdk-ref-javascript#workflow-overview) and [Background Token Auto-Refresh](https://unifiedid.com/docs/sdks/sdk-ref-javascript#background-token-auto-refresh).                                                                                                                                                                                                            |
|  6   | To exit the application, click **Clear UID2**.                                                                                                                                                                                                             | This event calls the UID2 SDK [`disconnect()`](https://unifiedid.com/docs/sdks/sdk-ref-javascript#disconnect-void) function, which clears the UID2 session and the first-party cookie and calls the Secure Signal [`clearAllCache()`](https://developers.google.com/publisher-tag/reference#googletag.secureSignals.SecureSignalProvidersArray_clearAllCache) function to clear all cached signals. This call also makes the UID2 SDK [`isLoginRequired()`](https://unifiedid.com/docs/sdks/sdk-ref-javascript#isloginrequired-boolean) function return `true`, which presents the user with the login form again.<br/> NOTE: The page displays the **Clear UID2** button as long as the user identity is valid and refreshable within the integration test environment.              |
