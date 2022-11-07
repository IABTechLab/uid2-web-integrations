# How to work with the SDK code

## Dependencies

This project uses `npm` to manage dependencies. When you first check out the code, and whenever you pull or switch branches, run `npm install` from this folder (i.e. `/js/`). Alternatively, in VS Code, you can right-click on `package.json` and select `instal

Use `npm install [package]` to add new dependencies which are needed at run-time (although this should be avoided - the goal is to keep the SDK lean and minimal), and `npm install [package] --save-dev` for build-time/dev-time dependencies.

## IDE setup

It's better to work with an IDE which understands TypeScript and provides useful tooling. VS Code is a good free option with great features, and everything should work out of the box.

### VS Code recommended extensions

These add-ons are recommended (or in some cases, required) when working on the JS SDK or other front-end components of UID2.

| Add-on | Publisher | Free option? | Description |
| :----- | :-------- | :----------: | :---------- |
| ESLint | Microsoft | ✔ | This is required. Ensure you have no lint errors before commiting, and definitely before raising a PR.
| npm | Microsoft | ✔ | This add-on is marked as deprecated (because the functionality exists in VS Code natively) but the add-on gives you a much nicer experience - you can right-click on `package.json` and choose "Install Dependencies" to run `npm install`, and you get a handy `NPM SCRIPTS` sidebar pane if you have `package.json` open. |
| TypeScript Extension Pack | Loiane Groner | ✔ | It provides a bunch of handy helper extensions for working in TypeScript.. |
| Wallaby.Js | Wallaby.js | ❓ | Provides live as-you-type code coverage and test results in the IDE. There is a free license for use with open source projects which looks like it's suitable for use with UID2, but make your own decision. This is a game-changer for working with JS/TS projects. |
| Quokka.js | Wallaby.js | ✔ | Gives you an interactive JavaScript/TypeScript playground. Particularly good for prototyping small bits of TS/JS or for learning syntax. There's a paid option but the free option is very good. |
| Jest | Orta | ✔ | Only if you don't have Wallaby.js. Adds your Jest tests to the VS Code test window and can provide coverage, results, and other information in the IDE. |

# Location of source and tests

There is currently a separate folder for tests for each version of the SDK. All of the tests prior to 3.0.0 point to the versions of the SDK placed in `../static/js/`, which is unfortunately outside the JavaScript root - this isn't really a problem for JavaScript, but with the introduction of TypeScript and a multi-file source which is intended to be built into multiple outputs (e.g. minified SDK, unminified SDK, npm package, ...) this becomes a problem.

The new approach is to place source `.ts` files in this folder (or sub-folders), but the current testing setup still uses a `uid2-sdk-3.0.0` folder for tests. There's no current decision for whether this will change or how versioning will be handled going forward - one option is to build the various outputs and check them in to the repo. This would allow us to keep a set of tests for each published version of the SDK.

# Running the tests

## While developing (e.g. watch mode)

Wallaby.js is the best way to do this. In VS Code with the Wallaby.js extension installed, hit `ctrl-shift-p` (or whatever you have bound to `View... Command Palette...`) and type `wallaby`. `Smart Start` will only start running tests from test files you've opened, while `Start` will run all tests (both commands keep running tests as you type).

For a feature overview of Wallaby.js, see [the Wallaby.js feature page](https://wallabyjs.com/#features). For detailed help on how to use it, see [the Wallaby.js docs](https://wallabyjs.com/docs/). There are video tutorials for most of the main features. Note that nobody who contributed to this document is affiliated with Wallaby.js in any way.

You might want to only run the tests for the SDK version you're working on. You can do this by updating the `jest` section of `package.json` to add a `testMatch` property. For example, this will only run the 3.0.0 tests:

```json
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": [
      "./setupJest.js"
    ],
    "testMatch": [
      "**/uid2-sdk-3.0.0/?(*.)+(spec|test).[jt]s?(x)"
    ]
  },
```

## One-off runs

You can just run `npm test` from this folder to run the tests. This is how they're run in CI.

# TypeScript files & structure

The core entry-point is currently uid2-sdk-3.0.0.ts - this is likely to be renamed to uid2-sdk.ts, and we may have other entry-points for other build outputs. The goal is to gradually reduce the responsibilities of the main `UID2` class in this file, and move related behaviours out to other classes/files. Eventually we should be able to rely on our source control and a build step with artifact store, rather than managing versions by checking in different numbered versions of files and folders.

The current design is heavily class-based, with types retro-fitted. It may worth moving to a more idiomatic functional style at some point, but this isn't a priority and preserving the current style may help developers familiar with the existing code-base continue to work with it.

All new source files _must_ be in TypeScript, with useful type information for all parts of the external interface.

# Creating/publishing artifacts

All commands should be run from the `js/` folder in this repo.

## To create a production-ready build of the SDK with no source-maps:

`npm run build` - the output will end up in `js/dist/bundle.js`.

## To create a development build of the SDK with full source-maps, and monitor for changes:

`npm run watch` - the output will end up in `js/dist/bundle.js` and will be rebuilt whenever any related files are changed.

## To output the development build to the uid2-examples folder, with watch:

First, ensure that this repo and the `uid2-examples` repo are checked out into the same parent folder, with folders matching the repository names.

`npm run uid2-examples`

The output will end up in `js/dist/bundle.js` and additional copies will be placed into the examples folders. Note that this is not currently being consumed by the examples and further work is required before this works as intended.
