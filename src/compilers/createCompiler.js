/* @flow */
const webpack = require('webpack');
const logger = require('boldr-utils/lib/logger');

module.exports = function createCompiler(config: WebpackCompiler) {
  let compiler;
  try {
    compiler = webpack(config);
  } catch (e) {
    logger.error('Failed to compile.', e);
    process.exit(1);
  }
  return compiler;
};
