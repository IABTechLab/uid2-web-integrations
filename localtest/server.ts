import Webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import webpackConfig from './webpack.config.js';
import { devSiteMap, devSites, port, urlPortSuffix } from './siteDetails.js';

// @ts-ignore
const compiler = Webpack(webpackConfig);
const hosts = Object.fromEntries(
  devSites.map((s) => [s.domain, { ...s, index: `/${s.name}.html` }])
);
const hostnames = Object.keys(hosts);
const devServerOptions = {
  ...webpackConfig.devServer,
  historyApiFallback: {
    verbose: true,
    rewrites: [
      {
        from: /^[^.]+$/,
        to: (context: any) => {
          const hostname = context.request.header('Host').split(':')[0];
          return hosts[hostname].index;
        },
      },
    ],
  },
  open: devSiteMap['www'].url,
  port,
  allowedHosts: hostnames,
  server: {
    type: 'https',
    options: {
      ca: '../ca/ca.crt',
      cert: '../ca/cert.crt',
      key: '../ca/cert.key',
    },
  },
};
const server = new WebpackDevServer(devServerOptions, compiler);

const runServer = async () => {
  console.log('Starting server...');
  await server.start();
};

runServer();
