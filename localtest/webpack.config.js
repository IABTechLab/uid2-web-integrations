const path = require('path');
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const { devSites } = require('./siteDetails');

const siteEntries = Object.fromEntries(devSites.map((d) => [d.name, `./${d.name}/${d.name}.html`]));

const sites = (module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: './dist',
    watchFiles: {
      paths: ['./**/*.*'],
      options: {
        usePolling: true,
      },
    },
  },
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      chunks(chunk) {
        return chunk.name !== 'sdk';
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s?css$/,
        use: ['css-loader', 'sass-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new HtmlBundlerPlugin({
      entry: siteEntries,
    }),
  ],
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
});
