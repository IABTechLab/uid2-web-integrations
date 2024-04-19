const uid2Entrypoint = './src/uid2/uid2Sdk.ts';
const euidEntrypoint = './src/euid/euidSdk.ts';
const espEntryPoint = './src/shared/secureSignal.ts';

const espOutput = {
  espScript: { import: espEntryPoint, filename: 'uid2SecureSignal.js' },
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
