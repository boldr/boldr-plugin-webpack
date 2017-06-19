# boldr-plugin-webpack

Webpack plugin designed for use with [Boldr](https://github.com/strues/boldr).

### Usage

Install the plugin in your project directory, `yarn add --dev boldr-plugin-webpack`.    
Edit your `boldr.config.js` file to "require" the plugin.   

```javascript
// boldr.config.js
module.exports = {
  env: {...},
  plugins:[require('boldr-plugin-webpack')],
  bundle: {...},
}
```

Once required in your `package.json`, the `boldr dev` and `boldr build` commands within [Boldr CLI](https://github.com/boldr/boldr-cli) will function appropriately.  

If you do **not** have Boldr CLI installed, go ahead and install it globally with `npm install -g boldr-cli`.   


### Configuration
Boldr uses a file, `boldr.config.js` in the root of your project directory for bundling and CLI
command configuration. Create the file if you don't already have one for your project.

Make sure you have dotenv installed as a dependency, as well as have created a `.env` file. The `.env` file should
contain the values within the env section below.   

The vendor array within the bundle object is used to create a vendor DLL bundle (during development) and a
common vendor bundle for production. It's important to include all project browser dependencies in this array. Otherwise,
the files will be bundled with your project code.

```javascript
// boldr.config.js

const path = require('path');
const dotenv = require('dotenv');
dotenv.load();
const base = (...args) => Reflect.apply(resolve, null, [path.resolve(__dirname), ...args])

module.exports = {
  env: {
    NODE_ENV: process.env.NODE_ENV,
    BOLDR_SERVER_PORT: process.env.BOLDR_SERVER_PORT,
    BOLDR_DEV_PORT: process.env.BOLDR_DEV_PORT,
    BOLDR_DEBUG: process.env.BOLDR_DEBUG,
    BOLDR_GRAPHQL: process.env.BOLDR_GRAPHQL,
  },
  plugins: [require('boldr-plugin-webpack')],
  bundle: {
    base,
    graphlUrl: 'http://localhost:3000/api/v1/graphql',
    verbose: true,
    debug: true,
    cssModules: true,
    wpProfile: false,
    webPath: '/assets/',
    publicDir: path.resolve(__dirname, 'public'),
    assetsDir: path.resolve(__dirname, 'dist/assets'),
    srcDir: path.resolve(__dirname, 'src'),
    client: {
      entry: path.resolve(__dirname, 'src/client/index.js'),
      admin: path.resolve(__dirname, 'src/client/admin.js'),
      bundleDir: path.resolve(__dirname, 'dist/assets'),
    },
    server: {
      entry: path.resolve(__dirname, 'src/server/index.js'),
      bundleDir: path.resolve(__dirname, 'dist'),
    },
    vendor: [
      'apollo-client',
      'axios',
      'boldr-ui',
      'boldr-utils',
      'classnames',
      'date-fns',
      'draft-convert',
      'draft-js',
      'draftjs-utils',
      'graphql-tag',
      'griddle-react',
      'lodash',
      'hoist-non-react-statics',
      'material-ui',
      'material-ui-icons',
      'prop-types',
      'react',
      'react-apollo',
      'react-dom',
      'react-dropzone',
      'react-helmet',
      'react-motion',
      'data-driven-motion',
      'react-redux',
      'react-router-dom',
      'react-router-redux',
      'react-tap-event-plugin',
      'react-transition-group',
      'redux',
      'redux-form',
      'redux-thunk',
      'reselect',
      'serialize-javascript',
      'styled-components',
      'uuid',
      'webfontloader',
    ],
  },
};

```
