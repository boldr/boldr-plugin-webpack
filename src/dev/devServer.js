/* eslint-disable require-await */
const path = require('path');
const { spawn } = require('child_process');
const debug = require('debug')('boldr:plugin:webpack:devServer');
const appRoot = require('boldr-utils/lib/node/appRoot');
const logger = require('boldr-utils/lib/logger');

module.exports = class DevServer {
  constructor(serverCompiler, clientCompiler) {
    const compiledEntryFile = path.resolve(
      appRoot.get(),
      serverCompiler.options.output.path,
      'server.js',
    );

    const startServer = async () => {
      if (this.server) {
        this.server.kill();
        this.server = null;
        logger.info('Restarting server...');
      }

      const newServer = spawn('node', [compiledEntryFile, '--colors'], {
        stdio: [process.stdin, process.stdout, 'pipe'],
      });

      logger.end('Server running with latest changes.');

      newServer.stderr.on('data', data => {
        process.stderr.write('\n');
        process.stderr.write(data);
        process.stderr.write('\n');
      });
      this.server = newServer;
    };

    const waitForClientThenStartServer = () => {
      if (this.serverCompiling) {
        return;
      }
      if (this.clientCompiling) {
        setTimeout(waitForClientThenStartServer, 100);
      } else {
        startServer();
      }
    };

    clientCompiler.plugin('compile', () => {
      logger.info('Building a new client bundle...');
      this.clientCompiling = true;
    });

    clientCompiler.plugin('done', stats => {
      logger.task('Client bundle compiled.');
      if (!stats.hasErrors()) {
        this.clientCompiling = false;
      }
    });

    serverCompiler.plugin('compile', () => {
      this.serverCompiling = true;
      logger.info('Building a new server bundle...');
    });

    serverCompiler.plugin('done', stats => {
      this.serverCompiling = false;

      if (this.exiting) {
        return;
      }

      try {
        if (stats.hasErrors()) {
          logger.error('Build failed, check the console for more information.');
          debug(stats.toString());
          return;
        }

        waitForClientThenStartServer();
      } catch (err) {
        logger.error(`Startup failed. ${err}`);
        process.exit(1);
      }
    });

    this.watcher = serverCompiler.watch(null, () => {});
  }
  shutdown() {
    this.exiting = true;

    const stopWatcher = new Promise(resolve => {
      this.watcher.close(resolve);
    });

    return stopWatcher.then(() => {
      if (this.server) {
        this.server.kill();
      }
    });
  }
};
