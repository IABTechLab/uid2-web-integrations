# Overview

Running the npm task `localtest` (`npm run localtest`) will start the server running on port 443. This is the default SSL port and you mustn't have anything else running on it. You can change this - see [configuration.md](./configuration.md).

You can access the site from any of the domains listed in `./siteDetails.js`. For example, you can visit `https://www.uid2-local-dev-setup.com/`. All files built for any domain are available on all domains, however each domain will get a different default index file when you visit the URL with no path.

## Folder layout

### `./static/`

All files in here are served as-is with no build pipeline. E.g. `thirdparty-script.js` is available on all domains - both of these URLs work fine:
https://www.unrelated-third-party-test.com/thirdparty-script.js
https://www.uid2-local-dev-setup.com/thirdparty-script.js

### `./shared/`

By convention, files imported to multiple sites go here. They are only used by the build process and aren't directly available via a URL.

### Other folders (e.g. `./www/`, `./auth/`)

Each of the folders defined in `./siteDetails.js` is a site (the site `name` property matches the folder). Given this entry in `siteDetails`:

```
  {
    name: 'www',
    domain: 'www.uid2-local-dev-setup.com',
  },
```

Based on the name, it will look in `./www/` for files. A HTML file with the same name as the folder (in this case, `./www/www.html`) is the default index page for that domain.

While you can access any file using any domain, please keep domain-specific files in the correct folder. Put files that you want to be served with no build step (e.g. images, shared JS libraries that you don't want built into a bundle) in `./static/`, and shared files that are imported or included into multiple sites in `./shared/`.

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

## HTML templating

`html-bundler-webpack-plugin` comes bundled with [eta.js](https://eta.js.org/) out of the box. It will be used to pre-process HTML files. You can provide data to the template in `./webpack.config.js` (make sure you get this one and not the webpack config in the root folder) - see the `data` value passed in to the `HtmlBundlerPlugin` constructor.

For example, this is used to provide the correct port in absolute URLs if you choose to run on a port other than 443. Search for `urlPortSuffix` to see how it's provided to the template engine (in `./webpack.config.js`) and how it's injected into a page (in `./www/www.html`).

## React

There is a very basic React setup. You can use TypeScript and .tsx files as usual. `./shared/createApp.tsx` exports a `createApp` function that you can use to attach a component to an element that (by convention) must have the id `app`. See e.g. `./www/www.html` and `./www/www.tsx`.

There is no router setup, although something like the React Browser Router should work if you need to install it. 404s will just serve up the default index file for the domain, which is important for React Router to work properly.
