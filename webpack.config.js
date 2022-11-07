const entrypoint = './uid2-sdk-3.0.0.ts';

// n.b. if you add more outputs, the path is relative to the js/dist folder.
const getExampleOutputs = (env) => !env.outputToExamples ? {} : {
  publisherStandard: { import: entrypoint, filename: '../../../uid2-examples/publisher/standard/public/dist/bundle.js' },
  publisherServerOnly: { import: entrypoint, filename: '../../../uid2-examples/publisher/server_only/public/dist/bundle.js' },
};

module.exports = (env, argv) => {
  const buildMode = argv.mode;
  const isProduction = buildMode === 'production';
  console.log(`Configuring webpack in ${buildMode} mode (isProduction === ${isProduction}).`);
  return {
    mode: buildMode,
    devtool: isProduction ? false : 'eval-source-map',
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
