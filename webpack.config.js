const entrypoint = './src/uid2Sdk.ts';
const espEntryPoint = './src/uid2Esp.ts';

const espOutput =  {
  espScript: { import: espEntryPoint, filename: 'uid2SecureSignal.js' },
}

// n.b. if you add more outputs, the path is relative to the dist folder.
const getExampleOutputs = (env) => !env.outputToExamples ? {} : {
  ...espOutputs,
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
    entry: !env.espOnly ? { 
      main: { import: entrypoint, filename: 'bundle.js' },
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
    cache: false,
    resolve: {
      extensions: ['.ts'],
    }
  };
};
