/* eslint-disable max-lines, prefer-template */

const path = require('path');
const fs = require('fs');
const debug = require('debug')('boldr:plugin:webpack:createBrowser');
const webpack = require('webpack');
const removeNil = require('boldr-utils/lib/arrays/removeNil');
const ifElse = require('boldr-utils/lib/logic/ifElse');
const mergeDeep = require('boldr-utils/lib/objects/mergeDeep');
const filterEmpty = require('boldr-utils/lib/objects/filterEmpty');
const appRoot = require('boldr-utils/lib/node/appRoot');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const AssetsPlugin = require('assets-webpack-plugin');
// const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const BabiliPlugin = require('babili-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const ChunkManifestPlugin = require('chunk-manifest-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const StatsPlugin = require('stats-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');
const boldrRoot = require('boldr-root');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');

const PATHS = require('./helpers/paths');
const LoggerPlugin = require('./plugins/LoggerPlugin');
const happyPackPlugin = require('./plugins/happyPackPlugin');

const LOCAL_IDENT = '[name]__[local]___[hash:base64:5]';
const CWD = fs.realpathSync(process.cwd());

const cache = {
  'client-production': {},
  'client-development': {},
};

module.exports = function createBrowserWebpack(
  { config, mode = 'development', name = 'client' } = {},
) {
  const { env: envVariables, bundle } = config;

  process.env.BABEL_ENV = mode;

  const _DEV = mode === 'development';
  const _PROD = mode === 'production';

  const ifDev = ifElse(_DEV);
  const ifProd = ifElse(_PROD);

  const BOLDR_DEV_PORT = parseInt(envVariables.BOLDR_DEV_PORT, 10) || 3001;

  const EXCLUDES = [
    /node_modules/,
    bundle.client.bundleDir,
    bundle.server.bundleDir,
    bundle.publicDir,
  ];

  function createIdentifier() {
    return JSON.stringify({
      env: envVariables.NODE_ENV + ',' + process.env.BABEL_ENV,
      version: require.resolve('../package.json').version,
    });
  }
  const sharedDir = path.resolve(bundle.srcDir, 'shared/');
  const prefetches = [
    path.resolve(bundle.srcDir, 'shared/scenes/Blog/BlogContainer.js'),
    path.resolve(bundle.srcDir, 'shared/scenes/Blog/routes.js'),
    path.resolve(bundle.srcDir, 'shared/scenes/Admin/AdminDashboard.js'),
    path.resolve(bundle.srcDir, 'shared/scenes/Admin/routes.js'),
    path.resolve(bundle.srcDir, 'shared/App.js'),
  ];

  const prefetchPlugins = prefetches.map(specifier => new webpack.PrefetchPlugin(specifier));

  // const testdir = bundle.base.bind(null, config.dir_src)
  const getEntry = () => {
    // For development
    let entry = {
      app: [
        ifDev(require.resolve('react-hot-loader/patch')),
        `${require.resolve(
          'webpack-hot-middleware/client',
        )}?path=http://localhost:${BOLDR_DEV_PORT}/__webpack_hmr&timeout=3000`,
        require.resolve('./polyfills/browser'),
        bundle.client.entry,
      ],
    };
    // For prodcution
    if (!_DEV) {
      entry = {
        app: [require.resolve('./polyfills/browser'), bundle.client.entry],
        // Register vendors here
        vendor: bundle.vendor,
      };
    }

    return entry;
  };
  const browserConfig = {
    // pass either node or web
    target: 'web',
    // user's project root
    context: CWD,
    // sourcemap
    devtool: _DEV ? 'cheap-module-eval-source-map' : 'source-map',
    entry: getEntry(),
    output: {
      path: bundle.client.bundleDir,
      filename: _DEV ? '[name].js' : '[name]-[chunkhash].js',
      chunkFilename: _DEV ? '[name]-[hash].js' : '[name]-[chunkhash].js',
      // Full URL in dev otherwise we expect our bundled output to be served from /assets/
      publicPath: _DEV ? `http://localhost:${BOLDR_DEV_PORT}/` : bundle.webPath,
      // only dev
      pathinfo: _DEV,
      libraryTarget: 'var',
      strictModuleExceptionHandling: true,
      devtoolModuleFilenameTemplate: info => path.resolve(info.absoluteResourcePath),
    },
    // fail on err
    bail: _PROD,
    // cache dev
    cache: cache[`client-${mode}`],
    // true if prod & enabled in settings
    profile: _PROD && bundle.wpProfile,
    node: {
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      console: true,
      __filename: true,
      __dirname: true,
    },
    performance: false,
    stats: {
      colors: true,
      reasons: bundle.debug,
      hash: bundle.verbose,
      version: bundle.verbose,
      timings: true,
      chunks: bundle.verbose,
      chunkModules: bundle.verbose,
      cached: bundle.verbose,
      cachedAssets: bundle.verbose,
    },
    resolve: {
      extensions: ['.js', '.json', '.jsx'],
      modules: ['node_modules', PATHS.srcDir, PATHS.projectNodeModules].concat(
        // It is guaranteed to exist because we tweak it in `env.js`
        process.env.NODE_PATH.split(path.delimiter).filter(Boolean),
      ),
      mainFields: ['web', 'browser', 'style', 'module', 'jsnext:main', 'main'],
      descriptionFiles: ['package.json'],
      alias: {
        '@@scenes': path.resolve(bundle.srcDir, 'shared/scenes'),
        '@@state': path.resolve(bundle.srcDir, 'shared/state'),
        '@@admin': path.resolve(bundle.srcDir, 'shared/scenes/Admin'),
        '@@blog': path.resolve(bundle.srcDir, 'shared/scenes/Blog'),
        '@@components': path.resolve(bundle.srcDir, 'shared/components'),
        '@@core': path.resolve(bundle.srcDir, 'shared/core'),
        '@@templates': path.resolve(bundle.srcDir, 'shared/templates'),
        '@@broot': path.resolve(boldrRoot.toString(), './'),
        // '@@broot':
      },
    },
    resolveLoader: {
      modules: [PATHS.boldrNodeModules, PATHS.projectNodeModules],
    },
    module: {
      strictExportPresence: true,
      noParse: [/\.min\.js/],
      rules: removeNil([
        // js
        {
          test: /\.(js|jsx)$/,
          include: bundle.srcDir,
          // exclude: EXCLUDES,
          use: removeNil([
            ifDev({
              loader: require.resolve('cache-loader'),
              options: {
                // provide a cache directory where cache items should be stored
                cacheDirectory: PATHS.cacheDir,
              },
            }),
            { loader: 'happypack/loader?id=hp-js' },
          ]),
        },
        // css
        {
          test: /\.css$/,
          exclude: EXCLUDES,
          include: bundle.srcDir,
          use: _DEV
            ? { loader: 'happypack/loader?id=hp-css' }
            : ExtractTextPlugin.extract({
                fallback: require.resolve('style-loader'),
                use: [
                  {
                    loader: require.resolve('css-loader'),
                    options: {
                      modules: bundle.cssModules,
                      minimize: true,
                      autoprefixer: false,
                      importLoaders: 2,
                      context: path.resolve(bundle.srcDir, './shared'),
                      localIdentName: '[hash:base64:5]',
                    },
                  },
                  {
                    loader: require.resolve('resolve-url-loader'),
                  },
                  {
                    loader: require.resolve('postcss-loader'),
                    options: {
                      // https://webpack.js.org/guides/migrating/#complex-options
                      ident: 'postcss',
                      sourceMap: false,
                      plugins: () => [
                        require('postcss-import')({
                          root: path.resolve(bundle.srcDir, './shared'),
                        }),
                        require('postcss-flexbugs-fixes'),
                        require('postcss-cssnext')({
                          browsers: bundle.browsers,
                          flexbox: 'no-2009',
                        }),
                        require('postcss-discard-duplicates'),
                      ],
                    },
                  },
                ],
              }),
        },
        // scss
        {
          test: /\.scss$/,
          include: bundle.srcDir,
          exclude: EXCLUDES,
          use: _DEV
            ? { loader: 'happypack/loader?id=hp-scss' }
            : ExtractTextPlugin.extract({
                fallback: require.resolve('style-loader'),
                use: [
                  {
                    loader: require.resolve('css-loader'),
                    options: {
                      importLoaders: 3,
                      localIdentName: '[hash:base64:5]',
                      context: path.resolve(bundle.srcDir, './shared'),
                      sourceMap: false,
                      modules: false,
                    },
                  },
                  {
                    loader: require.resolve('resolve-url-loader'),
                  },
                  {
                    loader: require.resolve('postcss-loader'),
                    options: {
                      // https://webpack.js.org/guides/migrating/#complex-options
                      ident: 'postcss',
                      parser: 'postcss-scss',
                      sourceMap: false,
                      plugins: () => [
                        require('postcss-flexbugs-fixes'),
                        require('postcss-cssnext')({
                          browsers: bundle.browsers,
                          flexbox: 'no-2009',
                        }),
                        require('postcss-discard-duplicates'),
                      ],
                    },
                  },
                  {
                    loader: require.resolve('sass-loader'),
                    options: {
                      sourceMap: false,
                      includePaths: [sharedDir],
                    },
                  },
                ],
              }),
        },
        // json
        {
          test: /\.json$/,
          loader: 'json-loader',
        },
        // url
        {
          test: /\.(png|jpg|jpeg|gif|svg|woff|woff2)$/,
          loader: require.resolve('url-loader'),
          exclude: EXCLUDES,
          options: { limit: 10000, emitFile: true },
        },
        {
          test: /\.svg(\?v=\d+.\d+.\d+)?$/,
          exclude: EXCLUDES,
          loader: `${require.resolve(
            'url-loader',
          )}?limit=10000&mimetype=image/svg+xml&name=[name].[ext]`, // eslint-disable-line
        },
        // file
        {
          test: /\.(ico|eot|ttf|otf|mp4|mp3|ogg|pdf|html)$/, // eslint-disable-line
          loader: require.resolve('file-loader'),
          exclude: EXCLUDES,
          options: {
            emitFile: true,
          },
        },
      ]),
    },
    plugins: removeNil([
      ...prefetchPlugins,
      new webpack.LoaderOptionsPlugin({
        minimize: !_DEV,
        debug: _DEV,
        context: CWD,
      }),
      // new webpack.IgnorePlugin(/any-promise/),
      new webpack.EnvironmentPlugin({
        NODE_ENV: JSON.stringify(mode),
      }),
      new webpack.NormalModuleReplacementPlugin(/^any-promise$/, 'bluebird'),
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(_DEV),
        __SERVER__: JSON.stringify(false),
        __CLIENT__: JSON.stringify(true),
        __CHUNK_MANIFEST__: JSON.stringify(
          path.join(bundle.assetsDir || '', 'chunk-manifest.json'),
        ),
        __ASSETS_MANIFEST__: JSON.stringify(
          path.join(bundle.assetsDir || '', 'assets-manifest.json'),
        ),
        __BROOT__: JSON.stringify(boldrRoot.toString()),
      }),
      happyPackPlugin({
        name: 'hp-js',
        loaders: [
          {
            path: require.resolve('babel-loader'),
            query: {
              babelrc: false,
              compact: true,
              sourceMaps: true,
              comments: false,
              cacheDirectory: !!_DEV,
              presets: [
                [
                  require.resolve('babel-preset-boldr/browser'),
                  {
                    useBuiltins: true,
                    modules: false,
                    exclude: ['transform-regenerator', 'transform-async-to-generator'],
                    targets: {
                      uglify: false,
                      browsers: ['> .5% in US', 'last 1 versions'],
                    },
                  },
                ],
              ],
              plugins: removeNil([
                [
                  require.resolve('babel-plugin-styled-components'),
                  {
                    ssr: true,
                  },
                ],
                [
                  require.resolve('babel-plugin-import-inspector'),
                  {
                    serverSideRequirePath: true,
                    webpackRequireWeakId: true,
                  },
                ],
                ifProd(require.resolve('babel-plugin-lodash')),
              ]),
            },
          },
        ],
      }),
      new AssetsPlugin({
        filename: 'assets-manifest.json',
        path: bundle.assetsDir,
        fullPath: true,
        prettyPrint: true,
      }),
    ]),
  };

  if (_DEV) {
    browserConfig.plugins.push(
      new webpack.NoEmitOnErrorsPlugin(),
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NamedModulesPlugin(),
      new WatchMissingNodeModulesPlugin(PATHS.projectNodeModules),
      happyPackPlugin({
        name: 'hp-css',
        loaders: [
          { path: require.resolve('style-loader') },
          {
            path: require.resolve('css-loader'),
            use: {
              importLoaders: 2,
              localIdentName: LOCAL_IDENT,
              sourceMap: false,
              modules: false,
              context: path.resolve(bundle.srcDir, './shared'),
            },
          },
          {
            loader: require.resolve('resolve-url-loader'),
          },
          {
            path: require.resolve('postcss-loader'),
            use: {
              // https://webpack.js.org/guides/migrating/#complex-options
              ident: 'postcss',
              plugins: () => [
                require('postcss-import')({
                  root: path.resolve(bundle.srcDir, './shared'),
                }),
                require('postcss-flexbugs-fixes'),
                require('postcss-cssnext')({
                  browsers: bundle.browsers,
                  flexbox: 'no-2009',
                }),
                require('postcss-discard-duplicates'),
              ],
            },
          },
        ],
      }),
      happyPackPlugin({
        name: 'hp-scss',
        loaders: [
          { path: require.resolve('style-loader') },
          {
            path: require.resolve('css-loader'),
            use: {
              importLoaders: 3,
              localIdentName: LOCAL_IDENT,
              sourceMap: true,
              modules: false,
              context: path.resolve(bundle.srcDir, './shared'),
            },
          },
          {
            loader: require.resolve('resolve-url-loader'),
          },
          {
            loader: require.resolve('postcss-loader'),
            use: {
              // https://webpack.js.org/guides/migrating/#complex-options
              ident: 'postcss',
              parser: 'postcss-scss',
              options: {
                sourceMap: true,
              },
              plugins: () => [
                require('postcss-flexbugs-fixes'),
                require('postcss-cssnext')({
                  browsers: ['> 1%', 'last 2 versions'],
                  flexbox: 'no-2009',
                }),
                require('postcss-discard-duplicates'),
              ],
            },
          },
          {
            path: require.resolve('sass-loader'),
            options: {
              sourceMap: true,
              includePaths: [sharedDir],
            },
          },
        ],
      }),
      new CircularDependencyPlugin({
        exclude: /a\.js|node_modules/,
        failOnError: false,
      }),
      new LoggerPlugin({
        verbose: bundle.verbose,
        target: 'web',
      }),
      new CaseSensitivePathsPlugin(),
      new webpack.DllReferencePlugin({
        manifest: require(path.resolve(bundle.assetsDir, '__vendor_dlls__.json')),
      }),
    );
  }
  if (_PROD) {
    browserConfig.plugins.push(
      new webpack.HashedModuleIdsPlugin(),
      new LodashModuleReplacementPlugin(),
      new webpack.optimize.ModuleConcatenationPlugin(),
      new webpack.optimize.CommonsChunkPlugin({
        name: 'vendor',
        minChunks(module) {
          // A module is extracted into the vendor chunk when...
          return (
            // If it's inside node_modules
            /node_modules/.test(module.context) &&
            // Do not externalize if the request is a CSS file
            !/\.(css|pcss|scss)$/.test(module.request)
          );
        },
      }),
      new webpack.optimize.CommonsChunkPlugin({
        name: 'common',
        minChunks: Infinity,
      }),
      new webpack.optimize.CommonsChunkPlugin({
        async: true,
        children: true,
        minChunks: 4,
      }),
      new ExtractTextPlugin({
        filename: '[name]-[contenthash:8].css',
        allChunks: true,
        ignoreOrder: bundle.cssModules,
      }),
      new webpack.optimize.AggressiveMergingPlugin(),
      new ChunkManifestPlugin({
        filename: 'chunk-manifest.json',
        manifestVariable: 'CHUNK_MANIFEST',
      }),
      new BabiliPlugin({ evaluate: false }, { comments: false }),
      new StatsPlugin('stats.json', {
        chunkModules: true,
        exclude: [/node_modules[\\/]react/],
      }),
      new BundleAnalyzerPlugin({
        openAnalyzer: false,
        analyzerMode: 'static',
        logLevel: 'error',
      }),
    );
  }
  return browserConfig;
};
