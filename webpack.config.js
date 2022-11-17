const entrypoint = './src/uid2Sdk.ts';
const espEntryPoint = './src/uid2Esp.ts';

// n.b. if you add more outputs, the path is relative to the dist folder.
const getExampleOutputs = (env) => !env.outputToExamples ? {} : {
  espScript: { import: espEntryPoint, filename: 'uid2ESP.js' },
  mockedGoogleTag: { import: './src/mockedGoogleTag.ts', filename: 'mockedGoogleTag.js' },
};

module.exports = (env, argv) => {
  const buildMode = argv.mode;
  const isProduction = buildMode === 'production';
  const prodSourceMaps = !!env.prodSourceMaps;
  console.log(`Configuring webpack in ${buildMode} mode (isProduction === ${isProduction}).`);
  return {
    mode: buildMode,
    devtool: isProduction ? (prodSourceMaps ? 'source-map' : false) : 'eval-source-map',
    entry: { 
      main: { import: entrypoint, filename: 'bundle.js' },
      ...getExampleOutputs(env)
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    cache: false,
    resolve: {
      extensions: ['.ts'],
    }
  };
};
