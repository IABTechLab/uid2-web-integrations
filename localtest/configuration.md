# Configuration

## Changing the port

This site runs on port 443 by default to give the most realistic setup possible. You can change this by updating the port in `./siteDetails.js`.

## Stop the `localtest` npm task from opening browser tabs

If you restart the server regularly but keep the tabs open, you might not want the npm task to open those tabs for you. To do this, comment out the `open` entry in `server.ts` - i.e. the following line:

```
open: hostnames.map((host) => `https://${host}${urlPortSuffix}/`),
```
