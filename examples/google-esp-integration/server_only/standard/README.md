# UID2 SDK Integration Example

This example demonstrates how a content publisher can use the UID2 services and the [Client-Side Identity JavaScript SDK](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/sdks/client-side-identity-v1.md) (also known as the UID2 SDK) to implement the [standard UID2 integration workflow](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/guides/publisher-client-side.md).

For an example application without using the UID2 SDK, see [Server-Only UID2 Integration Example](../server_only/README.md).

>NOTE: While the server side of the example application is implemented in JavaScript using node.js, it is not
a requirement. You can use any technology of your choice and refer to the example application for illustration of the functionality that needs to be implemented.

## Build and Run the Example Application

The easiest way to try the example is to use the following docker build command:

```
docker build . -t uid2-publisher-standard
docker run -it --rm -p 3000:3000 \
    -e UID2_BASE_URL="https://integ.uidapi.com" \
    -e UID2_API_KEY="<your-integ-API-key>" \
    uid2-publisher-standard
```

The following table lists the environment variables that you must specify to start the application.

| Parameter | Data Type | Description |
| :--- | :--- | :--- |
| `UID2_BASE_URL` | string | The base URL of the UID2 service. For example:</br>Testing environment: `https://integ.uidapi.com`<br/>Production environment: `https://prod.uidapi.com` |
| `UID2_API_KEY` | string | Your UID2 authentication key for the UID2 service specified in `UID2_BASE_URL`. |

After you see output similar to the following, the example application is up and running.

```
> uid2-publisher@1.0.0 start /usr/src/app
> node server.js

Example app listening at http://localhost:3000
```
If needed, to close the application, terminate the docker container or use the `Ctrl+C` keyboard shortcut.

## Test the Example Application

The example application illustrates the steps documented in the [UID2 SDK Integration Guide](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/guides/publisher-client-side.md). For an overview of the high-level workflow for establishing UID2 identity, API reference, and explanation of the UID2 cookie format, see [Client-Side Identity JavaScript SDK](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/sdks/client-side-identity-v1.md).

The following table outlines and annotates the steps you may take to test and explore the example application.

| Step | Description | Comments |
| :---: | :--- | :--- |
| 1 | In your browser, navigate to the application main page at `http://localhost:3000`. | The displayed main ([index](views/index.html)) page of the example application provides a login form for the user to complete the UID2 login process.</br>IMPORTANT: A real-life application must also display a form for the user to express their consent to targeted advertising. |
| 2 | In the text field at the bottom, enter the user email address that you want to use for testing and click **Log In**. | This is a call to the `/login` endpoint ([server.js](server.js)). The login initiated on the server side then calls the [GET /token/generate](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/endpoints/get-token-generate.md#response-format) endpoint and processes the received response. |
|   | A confirmation message appears with the established UID2 identity information. | The displayed identity information is the `body` property of the [JSON response payload](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/endpoints/get-token-generate.md#response-format) from the `GET /token/generate` response. It has been passed to the `login` [view](views/login.html) for rendering client-side JavaScript. Next, the identity information is passed to the [UID2 SDK `init()` function](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/sdks/client-side-identity-v1.md#initopts-object-void). If the identity is valid, the SDK stores it in a [first-party UID2 cookie](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/sdks/client-side-identity-v1.md#uid2-cookie-format) for use on subsequent page loads. |
| 3 | Click the **Back to the main page** link. | On the updated application main page, note the newly populated **UID2 Advertising Token** value. The [page view](views/index.html) calls the [init() function](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/sdks/client-side-identity-v1.md#initopts-object-void) again, but this time without passing an explicit identity. Instead, the identity is loaded from the first-party cookie. |
| 4  | (Optional) Right-click the main page to inspect the source code. | When the UID2 SDK initialization is complete, the SDK invokes the passed [callback function](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/sdks/client-side-identity-v1.md#callback-function) (`onUid2IdentityUpdated()` in this example).</br>IMPORTANT: The callback updates the page elements with the state of UID2 identity: this is the place where you should define your logic for initiating targeted advertising. |
| 5 | Keep the application main page open or refresh it after awhile and note the UID2 identity state, updated counter, and login information values. | In the background, the UID2 SDK continuously validates whether the advertising token is up-to-date and refreshes it automatically when needed. If the refresh succeeds, the user opts out, or the refresh token expires, the callback function is invoked and the UI elements are updated with the current state of the UID2 identity. For details, see [Workflow States and Transitions](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/sdks/client-side-identity-v1.md#workflow-states-and-transitions) and [Background Token Auto-Refresh](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/sdks/client-side-identity-v1.md#background-token-auto-refresh). |
| 6 | To exit the application, click **Log Out**. | This calls the [UID2 SDK `disconnect()` function](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/sdks/client-side-identity-v1.md#disconnect-void), which clears the UID2 session and the first-party cookie. This call also makes the [UID2 SDK `isLoginRequired()` function](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/sdks/client-side-identity-v1.md#isloginrequired-boolean) return `true`, which presents the user with the login form again.<br/> NOTE: The page displays the **Log Out** button as long as the user identity is valid and refreshable.  |

