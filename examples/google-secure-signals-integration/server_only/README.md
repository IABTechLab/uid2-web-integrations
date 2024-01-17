# Server-Only UID2 Secure Signals Integration Example

This example demonstrates how a content publisher who is working with [Google Interactive Media Ads(IMA) SDKs](https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side) can use [Google Secure Signal](https://support.google.com/admanager/answer/10488752) to share UID2 directly with bidders, in a server-only implementation of UID2.

For an example application using the [Client-Side Identity JavaScript SDK](https://github.com/IABTechLab/uid2docs/blob/main/api/v2/sdks/client-side-identity.md), see [UID2 SDK Integration Example](../with_sdk_v3/README.md).

> NOTE: Although the server side of the example application is implemented in JavaScript using node.js, it is not a requirement. You can use any technology of your choice and refer to the example application for an illustration of the functionality that needs to be implemented.

## Build and Run the Example Application

The easiest way to try the example is to use the following Docker Build command:

```
docker build . -t uid2-secure-signals-server
docker run -it --rm -p 3000:3000 \
    -e UID2_BASE_URL="https://operator-integ.uidapi.com" \
    -e UID2_API_KEY="<your-integ-API-key>" \
    -e UID2_CLIENT_SECRET="<your-integ-client-secret>" \
    -e SESSION_KEY="<your-uid2-session-key>" \
    -e AD_TAG_URL="<your-IMA-ad-tag-url>" \
    uid2-secure-signals-server
```

The following table lists the environment variables that you must specify to start the application.

| Parameter            | Data Type | Description                                                                                                                                              |
| :------------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UID2_BASE_URL`      | string    | The base URL of the UID2 service. For example:</br>Testing environment: `https://integ.uidapi.com`<br/>Production environment: `https://prod.uidapi.com` |
| `UID2_API_KEY`       | string    | Your UID2 authentication key for the UID2 service specified in `UID2_BASE_URL`.                                                                          |
| `UID2_CLIENT_SECRET` | string    | Your UID2 client secret for the UID2 service specified in `UID2_BASE_URL`.                                                                               |
| `SESSION_KEY`        | string    | The key to the encryption session data stored in the application's session cookie.                                                                       |
| `AD_TAG_URL`         | string    | The ad tag URL to test ad requests.                                                                                                                      |

Output similar to the following indicates that the example application is up and running.

```
> uid2-publisher@1.0.0 start /usr/src/app
> node server.js

Example app listening at http://localhost:3000
```

If needed, to close the application, terminate the Docker container or use the `Ctrl+C` keyboard shortcut.

## Test the Example Application

The application provides three main pages:

- index (main)
- example content 1
- example content 2

Access to these pages is possible only after the user completes the login process. If login is not complete, the user is redirected to the login page.

Submitting the login form simulates logging in to a publisher's application in the real world. Normally, the login
would require checking the user's secure credentials (for example, a password). In this example, for demonstration purposes, this
step is omitted, and the login process focuses on integration with the UID2 services instead.

The following table outlines and annotates the steps you can take to test and explore the example application.

| Step | Description                                                                                    | Comments                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| :--: | :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1   | In your browser, navigate to the application main page at `http://localhost:3000`.             | The displayed main (index) page of the example application provides a [login form](views/login.html) for the user to complete the UID2 login process.</br>IMPORTANT: A real-life application must also display a form for the user to consent to targeted advertising.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|  2   | Enter the email address that you want to use for testing and click **Log In**.                 | The click calls the Secure Signal [`clearAllCache()`](https://developers.google.com/publisher-tag/reference#googletag.secureSignals.SecureSignalProvidersArray_clearAllCache) function, to clear all cached signals from local storage, and then calls the `/login` endpoint ([server.js](server.js)). The login initiated on the server side then calls the [GET /token/generate](https://github.com/IABTechLab/uid2docs/blob/main/api/v1/endpoints/get-token-generate.md#response-format) endpoint and processes the received response.                                                                                                                                                                                                                                                                                                                                                      |
|      | The main page updates to display the established UID2 identity information and a video player. | The displayed identity information is the `body` property of the [JSON response payload](https://github.com/IABTechLab/uid2docs/blob/main/api/v1/endpoints/get-token-generate.md#response-format) from the successful `GET /token/generate` response. If the response is successful, the returned identity is saved to a session cookie (a real-world application would use a different way to store session data) and the protected index page is rendered. While the main page is loading, [Google Publisher Tag (GPT)](https://developers.google.com/publisher-tag/reference#googletag) auto-loads the Secure Signal UID2 script which pushes the advertising token to GPT local storage. The [Interactive Media Ads (IMA) SDK](https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side) then makes an ad request, and transmits the encoded signal in the request. |
|  4   | Click **Play**.                                                                                | This triggers AdsManager to insert the ad returned from the ad request, for display. The ad tag used in this example contains a 10-second pre-roll.ad.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|  5   | To exit the application, click **Log Out**.                                                    | This calls the Secure Signal [`clearAllCache()`](https://developers.google.com/publisher-tag/reference#googletag.secureSignals.SecureSignalProvidersArray_clearAllCache) function, to clear all cached signals, and then calls the `/logout` endpoint on the server ([server.js](server.js)), which clears the UID2 session and the first-party cookie and presents the user with the login form again.<br/> NOTE: As long as the user is logged in, the page displays the **Log Out** button.                                                                                                                                                                                                                                                                                                                                                                                                 |
