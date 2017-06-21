/* @flow */
/* eslint-disable global-require, no-console, require-await */
require('promise/lib/es6-extensions.js');
const path = require('path');
const fs = require('fs-extra');
const debug = require('debug')('boldr:plugin:webpack');
const webpack = require('webpack');
const terminate = require('terminate');
const getDefault = require('boldr-utils/lib/node/getDefault');
const logger = require('boldr-utils/lib/logger');

const createSingleCompiler = require('./compilers/createSingleCompiler');
const buildDevDlls = require('./dev/buildDevDlls');
const createBrowserWebpack = require('./createBrowserWebpack');
const createNodeWebpack = require('./createNodeWebpack');

const plugin: Plugin = (engine: Engine, runOnce: boolean = false): PluginController => {
  const config: Config = engine.getConfiguration();
  return {
    async build() {
      const clientConfig = createBrowserWebpack({
        config,
        mode: 'production',
        name: 'client',
      });
      const serverConfig = createNodeWebpack({
        config,
        mode: 'production',
        name: 'server',
      });

      fs.removeSync(config.bundle.client.bundleDir);
      fs.removeSync(config.bundle.server.bundleDir);
      const compilers = [createSingleCompiler(clientConfig), createSingleCompiler(serverConfig)];
      return Promise.all(compilers);
    },
    async start() {
      return Promise.resolve();
    },
    async dev() {
      logger.start('Starting development bundling process.');
      const config = engine.getConfiguration();
      await buildDevDlls(config);

      // instantiate plugins
      // eslint-disable-next-line babel/new-cap
      const BoldrDev = getDefault(require('./dev/boldrDev'));

      // Create a new development devServer.
      const devServer = new BoldrDev(config);

      ['SIGINT', 'SIGTERM'].forEach(signal => {
        process.on(signal, () => {
          devServer.shutdown();
          logger.end('Development stopped. 💠  All listeners removed.');
          process.exit(0);
        });
      });
    },
    async end() {
      if (serverCompiler) {
        terminate(process.pid);
      }
      return true;
    },
  };
};

module.exports = plugin;
