# Server-Only UID2 ESP Integration Example

This example demonstrates how a content publisher who are working with (Google Publisher Tags) can use the ESP (Google Encrypted Signals for Publishers) to share UID2 direclty with bidders.

For an example application using the [Client-Side Identity JavaScript SDK](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/sdks/client-side-identity-v1.md), see [UID2 SDK Integration Example](../with_sdk_v3/README.md).

> NOTE: While the server side of the example application is implemented in JavaScript using node.js, it is not a requirement. You can use any technology of your choice and refer to the example application for illustration of the functionality that needs to be implemented.

## Build and Run the Example Application

The easiest way to try the example is to use the following docker build command:

```
docker build . -t uid2-publisher-server
docker run -it --rm -p 3000:3000 \
    -e UID2_BASE_URL="https://operator-integ.uidapi.com" \
    -e UID2_API_KEY="<your-integ-API-key>" \
    -e SESSION_KEY="my-session-key" \
    uid2-publisher-server
```

The following table lists the environment variables that you must specify to start the application.

| Parameter       | Data Type | Description                                                                                                                                              |
| :-------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UID2_BASE_URL` | string    | The base URL of the UID2 service. For example:</br>Testing environment: `https://integ.uidapi.com`<br/>Production environment: `https://prod.uidapi.com` |
| `UID2_API_KEY`  | string    | Your UID2 authentication key for the UID2 service specified in `UID2_BASE_URL`.                                                                          |
| `SESSION_KEY`   | string    | The key to the encryption session data stored in application's session cookie.                                                                           |

After you see output similar to the following, the example application is up and running.

```
> uid2-publisher@1.0.0 start /usr/src/app
> node server.js

Example app listening at http://localhost:3000
```

If needed, to close the application, terminate the docker container or use the `Ctrl+C` keyboard shortcut.

## Test the Example Application

The example application illustrates the steps documented in the [Server-Only UID2 Integration Guide](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/guides/custom-publisher-integration.md).

The application provides three main pages: index (main), example content 1, and example content 2. Access to these pages is possible only after the user completes the login process. If the user is not logged in, they will be redirected to the login page.

Submitting the login form simulates logging in to a publisher's application in the real world. Normally the login
would require checking the user's secure credentials (for example, a password), but for demonstration purposes this
step is omitted, and the login process focuses on integration with the UID2 services instead.

The following table outlines and annotates the steps you may take to test and explore the example application.

| Step | Description                                                                                                                   | Comments                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :--: | :---------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1   | In your browser, navigate to the application main page at `http://localhost:3000`.                                            | The displayed main (index) page of the example application provides a [login form](views/login.html) for the user to complete the UID2 login process.</br>IMPORTANT: A real-life application must also display a form for the user to express their consent to targeted advertising.                                                                                                                                                                                                                                                                                                                                                                                                          |
|  2   | Enter the user email address that you want to use for testing and click **Log In**.                                           | This is a call to the `/login` endpoint ([server.js](server.js)). The login initiated on the server side then calls the [GET /token/generate](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/endpoints/get-token-generate.md#response-format) endpoint and processes the received response.                                                                                                                                                                                                                                                                                                                                                                                          |
|      | The main page updates to display links to the two pages with protected content and the established UID2 identity information. | The displayed identity information is the `body` property of the [JSON response payload](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/endpoints/get-token-generate.md#response-format) from the successful `GET /token/generate` response. If the response is successful, the returned identity is saved to a session cookie (a real-world application would use a different way to store session data) and the protected index page is rendered.                                                                                                                                                                                                                                  |
|  3   | Click a content page.                                                                                                         | When the user requests the index or content pages, the server reads the user session and extracts the current UID2 identity ([server.js](server.js)). The `advertising_token` on the identity can be used for targeted advertising.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|  4   | Click the **Back to the main page** link.                                                                                     | Note that the identity contains several timestamps that determine when the advertising token becomes invalid (`identity_expires`) and when the server should attempt to refresh it (`refresh_from`). Every time a protected page is requested, the `verifyIdentity` function ([server.js](server.js)) calls [GET /token/refresh](https://github.com/UnifiedID2/uid2docs/blob/main/api/v1/endpoints/get-token-refresh.md) as needed.<br/>The user is automatically logged out in the following cases:<br/>- If the identity expires without being refreshed and refresh attempt fails.<br/>- If the refresh token expires.<br/>- If the refresh attempt indicates that the user has opted out. |
|  5   | To exit the application, click **Log Out**.                                                                                   | This calls the `/logout` endpoint on the server ([server.js](server.js)), which clears the UID2 session and the first-party cookie and presents the user with the login form again.<br/> NOTE: The page displays the **Log Out** button as long as the user is logged it.                                                                                                                                                                                                                                                                                                                                                                                                                     |
