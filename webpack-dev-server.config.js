const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    uid2: './src/uid2/uid2Sdk.ts',
    euid: './src/euid/euidSdk.ts',
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
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]-sdk.js',
  },
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
