# How to work with the SDK code

## Dependencies

This project uses `npm` to manage dependencies. When you first check out the code, and whenever you pull or switch branches, run `npm install` from this folder. Alternatively, in VS Code, you can right-click on `package.json` and select `Install Dependencies` (if you have the recommended `npm` extension installed).

Use `npm install [package]` to add new dependencies which are needed at run-time (although this should be avoided - the goal is to keep the SDK lean and minimal), and `npm install [package] --save-dev` for build-time/dev-time dependencies.

## IDE setup

It's better to work with an IDE which understands TypeScript and provides useful tooling. VS Code is a good free option with great features, and everything should work out of the box.

### VS Code recommended extensions

These extension are recommended (or in some cases, required) when working on the JS SDK or other front-end components of UID2.

| extension                 | Publisher     | Free option? | Description                                                                                                                                                                                                                                                                                                                       |
| :------------------------ | :------------ | :----------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint                    | Microsoft     |      ✔       | This is required. Ensure you have no lint errors before committing, and definitely before raising a PR.                                                                                                                                                                                                                           |
| npm                       | Microsoft     |      ✔       | This extension is marked as deprecated (because the functionality exists in VS Code natively) but the extension gives you a much nicer experience - you can right-click on `package.json` and choose "Install Dependencies" to run `npm install`, and you get a handy `NPM SCRIPTS` sidebar pane if you have `package.json` open. |
| TypeScript Extension Pack | Loiane Groner |      ✔       | It provides a bunch of handy helper extensions for working in TypeScript..                                                                                                                                                                                                                                                        |
| Wallaby.Js                | Wallaby.js    |      ❓      | Provides live as-you-type code coverage and test results in the IDE. There is a free license for use with open source projects which looks like it's suitable for use with UID2, but make your own decision. This is a game-changer for working with JS/TS projects.                                                              |
| Quokka.js                 | Wallaby.js    |      ✔       | Gives you an interactive JavaScript/TypeScript playground. Particularly good for prototyping small bits of TS/JS or for learning syntax. There's a paid option but the free option is very good.                                                                                                                                  |
| Jest                      | Orta          |      ✔       | Only if you don't have Wallaby.js. Adds your Jest tests to the VS Code test window and can provide coverage, results, and other information in the IDE.                                                                                                                                                                           |

# Older versions of the SDK

You can find earlier versions in the [UID2 Operator repository](https://github.com/IABTechLab/uid2-operator/).

# Location of source and tests

The main code is located in the `src` folder. All code which is intended for distribution should be there. Unit tests can be placed in a `[filename].spec.ts` (or similar) file next to the file they are testing.

All integration tests should go into the `integrationTests` folder.

# Running the tests

## While developing (e.g. watch mode)

Wallaby.js is the best way to do this. In VS Code with the Wallaby.js extension installed, hit `ctrl-shift-p` (or whatever you have bound to `View... Command Palette...`) and type `wallaby`. `Smart Start` will only start running tests from test files you've opened, while `Start` will run all tests (both commands keep running tests as you type). If you are prompted for the configuration location, select automatic configuration based on the project folder.

For a feature overview of Wallaby.js, see [the Wallaby.js feature page](https://wallabyjs.com/#features). For detailed help on how to use it, see [the Wallaby.js docs](https://wallabyjs.com/docs/). There are video tutorials for most of the main features. Note that nobody who contributed to this document is affiliated with Wallaby.js in any way.

## One-off runs

You can just run `npm test` from this folder to run the tests. This is how they're run in CI.

# TypeScript files & structure

The core entry-point is currently uid2Sdk.ts - in future we may have other entry-points for other build outputs. The goal is to gradually reduce the responsibilities of the main `UID2` class in this file, and move related behaviours out to other classes/files.

The current design is heavily class-based, with types retro-fitted. It may worth moving to a more idiomatic functional style at some point, but this isn't a priority and preserving the current style may help developers familiar with the existing code-base continue to work with it.

All new source files _must_ be in TypeScript, with useful type information for all parts of the external interface.

# Creating/publishing artifacts

## To create a production-ready build of the SDK with no source-maps:

`npm run build` - the output will end up in `dist/bundle.js`. This is the officially-distributed build.

## To create a production-ready build of the SDK with source-maps side-by-side:

`npm run build-with-sourcemaps` - the output will end up in `dist/*.js`. Use this if you want to host a version with source maps for easier debugging.

## To create a development build of the SDK with full source-maps, and monitor for changes:

`npm run watch` - the output will end up in `dist/bundle.js` and will be rebuilt whenever any related files are changed.

## To publish SDK to NPM repo and CDN

1. Bump update version in `package.json` and then run:
   ```bash
   npm install
   ```
2. Use `Publish SDK to NPM and CDN` Action.

### Prerelease

If you intend to publish a prerelease version:

1. Update the version number in package.json with the desired prerelease tag. For instance: `3.0.3-alpha.0`
2. When triggering the `Publish SDK to NPM and CDN` Action, ensure to add the relevant tag e.g. `alpha`.

## To output the development build to the uid2-examples folder, with watch:

First, ensure that this repo and the `uid2-examples` repo are checked out into the same parent folder, with folders matching the repository names.

`npm run uid2-examples`

The output will end up in `dist/bundle.js` and additional copies will be placed into the examples folders. Note that this is not currently being consumed by the examples and further work is required before this works as intended.
