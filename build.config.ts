import { BuildConfig, defineBuildConfig } from 'unbuild';
import * as current from './package.json';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const npmPackageFilename = 'package.json';
const npmPackageFolder = './unbuild/';
const npmPackagePath = `${npmPackageFolder}${npmPackageFilename}`;
function createNpmPackageJson(folder: string, packageName: string) {
  const json = {
    name: current.name, // TODO update
    version: current.version,
    description: current.description.replace('UID2', packageName),
    author: current.author,
    license: current.license,
    engines: current.engines,
  };
  writeFileSync(path.join(folder, npmPackageFilename), JSON.stringify(json), {
    flag: 'wx',
  });
}
const npmBuildOptions: BuildConfig = {
  declaration: 'compatible',
  rollup: {
    esbuild: {
      minify: false,
    },
  },
  hooks: {
    'build:done': (ctx) => {
      createNpmPackageJson(ctx.options.outDir, ctx.options.name);
    },
  },
};
export default defineBuildConfig([
  {
    name: 'UID2',
    entries: ['./src/uid2Sdk.ts'],
    outDir: 'dist/uid2-npm',
    ...npmBuildOptions,
  },
  {
    name: 'EUID',
    entries: ['./src/euidSdk.ts'],
    outDir: 'dist/euid-npm',
    ...npmBuildOptions,
  },
]);
