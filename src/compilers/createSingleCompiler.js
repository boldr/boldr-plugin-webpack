/* @flow */
const debug = require('debug')('boldr:plugin:webpack:singleCompiler');
const webpack = require('webpack');
const logger = require('boldr-utils/lib/logger');

/**
 * Exactly like its name, this function starts webpack, runs it and resolves
 * @param  {Object} webpackConfig webpack configuration
 * @return {Promise}               the buid will finish, or reject
 */
module.exports = function createSingleCompiler(webpackConfig: WebpackCompiler): Promise<any> {
  return new Promise((resolve, reject) => {
    webpack(webpackConfig, (err, stats) => {
      if (err || stats.hasErrors()) {
        debug('stats', stats.toString());
        return reject(err);
      }

      return resolve();
    });
  });
};
