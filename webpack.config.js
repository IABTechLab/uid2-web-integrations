const entrypoint = './src/uid2Sdk.ts';
const espEntryPoint = './src/uid2SecureSignal.ts';

const espOutput =  {
  espScript: { import: espEntryPoint, filename: 'secureSignal.js' },
}

// n.b. if you add more outputs, the path is relative to the dist folder.
const getExampleOutputs = (env) => !env.outputToExamples ? {} : {
  ...espOutput,
  mockedGoogleTag: { import: './src/mockedGoogleTag.ts', filename: 'mockedGoogleTag.js' },
};

module.exports = (env, argv) => {
  const buildMode = argv.mode;
  const isProduction = buildMode === 'production';
  const prodSourceMaps = !!env.prodSourceMaps;
  console.log(`Configuring webpack in ${buildMode} mode (isProduction === ${isProduction}).`);
  return {
    mode: buildMode,
    devtool: prodSourceMaps ? 'source-map' : false,
    entry: !env.espOnly ? { 
      main: { import: entrypoint, filename: `uid2-sdk-${process.env.npm_package_version}.js` },
      ...getExampleOutputs(env)
    } : espOutput,
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
      minimize: isProduction
    },
    cache: false,
    resolve: {
      extensions: ['.ts'],
    }
  };
};
