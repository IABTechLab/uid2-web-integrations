const fs = require('fs');
const path = require('path');
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const { devSites, urlPortSuffix } = require('./siteDetails');

const allEntries = Object.fromEntries(
  devSites.flatMap((s) =>
    fs
      .readdirSync(`./${s.name}/`)
      .filter((fn) => fn.endsWith('.html'))
      .map((fn) => [fn.split('/').reverse()[0].replace('.html', ''), `./${s.name}/${fn}`])
  )
);

const sites = (module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: './static',
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
      entry: allEntries,
      data: {
        urlPortSuffix,
      },
    }),
  ],
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
});
