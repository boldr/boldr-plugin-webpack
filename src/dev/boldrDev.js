/* eslint-disable eqeqeq */
const path = require('path');
const debug = require('debug')('boldr:plugin:webpack:boldrDev');
const webpack = require('webpack');
const logger = require('boldr-utils/lib/logger');
const createCompiler = require('../compilers/createCompiler');
const createBrowserWebpack = require('../createBrowserWebpack');
const createNodeWebpack = require('../createNodeWebpack');

const DevServer = require('./devServer');
const DevClient = require('./devClient');
const buildDevDlls = require('./buildDevDlls');

module.exports = class BoldrDev {
  constructor(config) {
    this.devClient = null;
    this.devServer = null;
    this.config = config;

    this.init(config);
  }
  init(config) {
    const serverConfig = createNodeWebpack({
      config,
      mode: 'development',
      name: 'server',
    });
    const clientConfig = createBrowserWebpack({
      config,
      mode: 'development',
      name: 'client',
    });
    new Promise(resolve => {
      const clientCompiler = createCompiler(clientConfig);
      clientCompiler.plugin('done', stats => {
        if (!stats.hasErrors()) {
          resolve(clientCompiler);
        }
      });
      this.devClient = new DevClient(clientCompiler, this.config);
    }).then(clientCompiler => {
      const serverCompiler = createCompiler(serverConfig);
      this.devServer = new DevServer(serverCompiler, clientCompiler);
    });
  }
  shutdown() {
    // Shutdown the client server, then the node.
    return handleShutdown(this.devClient)
      .then(() => handleShutdown(this.devServer))
      .catch(error => {
        console.error(error);
      });
  }
};

function handleShutdown(server) {
  return server ? server.shutdown() : Promise.resolve();
}
