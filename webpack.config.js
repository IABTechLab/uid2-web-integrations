const uid2Entrypoint = './src/uid2Sdk.ts';
const euidEntrypoint = './src/euidSdk.ts';
const espEntryPointUid2 = './src/secureSignalUid2.ts';
const espEntryPointEuid = './src/secureSignalEuid.ts';
const espSharedEntryPoint = './src/secureSignal_shared.ts';

const espOutput = {
  'uid2-secureSignals': {
    import: espEntryPointUid2,
    filename: `uid2SecureSignal.js`,
  },
  'euid-secureSignals': {
    import: espEntryPointEuid,
    filename: `euidSecureSignal.js`,
  },
  'secureSignals-shared': {
    import: espSharedEntryPoint,
    filename: `secureSignalShared.js`,
  },
};

// n.b. if you add more outputs, the path is relative to the dist folder.
const getExampleOutputs = (env) => (!env.outputToExamples ? {} : espOutput);

module.exports = (env, argv) => {
  const buildMode = argv.mode;
  const isProduction = buildMode === 'production';
  const prodSourceMaps = !!env.prodSourceMaps;
  console.log(`Configuring webpack in ${buildMode} mode (isProduction === ${isProduction}).`);
  return {
    mode: buildMode,
    devtool: prodSourceMaps ? 'source-map' : false,
    entry: !env.espOnly
      ? {
          'uid2-sdk': {
            import: uid2Entrypoint,
            filename: `uid2-sdk-${process.env.npm_package_version}.js`,
          },
          'euid-sdk': {
            import: euidEntrypoint,
            filename: `euid-sdk-${process.env.npm_package_version}.js`,
          },
          ...getExampleOutputs(env),
        }
      : espOutput,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    optimization: {
      minimize: isProduction,
    },
    cache: false,
    resolve: {
      extensions: ['.ts'],
    },
  };
};
