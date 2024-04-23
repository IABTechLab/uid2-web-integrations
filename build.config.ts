import { BuildConfig, BuildContext, defineBuildConfig } from 'unbuild';
import * as current from './package.json';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const npmPackageFilename = 'package.json';
const npmPackageFolder = './unbuild/';
const npmBuildOptions: BuildConfig = {
  declaration: 'compatible',
  rollup: {
    esbuild: {
      minify: false,
    },
  },
  hooks: {
    'build:done': (ctx) => {
      createNpmPackageJson(ctx);
    },
  },
};
const productOptions = [
  {
    name: 'EUID',
    packageName: '@unified-id/euid-sdk',
    buildConfig: {
      name: 'EUID',
      entries: ['./src/euidSdk.ts'],
      outDir: 'dist/euid-npm',
      ...npmBuildOptions,
    },
  },
  {
    name: 'UID2',
    packageName: '@uid2/uid2-sdk',
    buildConfig: {
      name: 'UID2',
      entries: ['./src/uid2Sdk.ts'],
      outDir: 'dist/uid2-npm',
      ...npmBuildOptions,
    },
  },
];
function createNpmPackageJson(ctx: BuildContext) {
  const options = productOptions.find((p) => p.name === ctx.options.name);
  if (!options)
    throw new Error(`Could not find product options for build named ${ctx.options.name}`);
  const json = {
    name: options.packageName,
    version: current.version,
    description: current.description.replace('UID2', ctx.options.name),
    author: current.author,
    license: current.license,
    engines: current.engines,
    main: ctx.buildEntries.find((e) => e.exports)!.path,
    types: ctx.buildEntries.find((e) => e.path.includes('.d.ts'))!.path,
  };
  writeFileSync(path.join(ctx.options.outDir, npmPackageFilename), JSON.stringify(json), {
    flag: 'wx',
  });
}

export default defineBuildConfig(productOptions.map((p) => p.buildConfig));
