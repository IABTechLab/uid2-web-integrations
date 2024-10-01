# Overview

Running the npm task `localtest` (`npm run localtest`) will start the server running on port 443. This is the default SSL port and you mustn't have anything else running on it.

You can access the site from any of the domains listed in `./siteDetails.js`. For example, you can visit `https://www.uid2-local-dev-setup.com/`. All files built for any domain are available on all domains, however each domain will get a different index file if you don't provide a filename in the URL.

## Folder layout

### `./static/`

All files in here are served as-is with no build pipeline. E.g. `thirdparty-script.js` is available on all domains - both of these URLs work fine:
https://www.unrelated-third-party-test.com/thirdparty-script.js
https://www.uid2-local-dev-setup.com/thirdparty-script.js

### `./shared/`

By convention, files imported to multiple sites go here.

### Other folders (e.g. `./www/`, `./auth/`)

Each of these folders defined in `./siteDetails.js` is a site (the site `name` property matches the folder). You can find the URL for each site in `siteDetails.js`. A html file with the same name as the folder is the index file - so if you visit `https://www.uid2-local-dev-setup.com/` (in `siteDetails.js`, that URL has a site named `www`), you will get `./www/www.html`.

## Build process & files

Webpack is configured to use [html-bundler-webpack-plugin](https://github.com/webdiscus/html-bundler-webpack-plugin). It will treat every html file in one of the site folders as an entry-point.

You can reference other files using relative paths, and webpack will build your bundles and update the URLs as needed.

For example, this tag in `./www/www.html`:

```html
<script src="./www.tsx" defer="defer"></script>
```

Will result in `./www/www.tsx` being built (with all imported dependencies) to something like `www.bundle.js` and the script tag being updated to:

```html
<script src="www.bundle.js" defer="defer"></script>
```

The same applies for `.scss` files.

## React

There is a very basic React setup. You can use TypeScript and .tsx files as usual. `./shared/createApp.tsx` exports a `createApp` function that you can use to attach a component to an element that (by convention) must have the id `app`. See e.g. `./www/www.html` and `./www/www.tsx`.

There is no router setup, although something like the React Browser Router should work if you need to install it.
