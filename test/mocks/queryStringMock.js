/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * query-string v9 is a pure ESM module whose index.js has only a default export:
 *
 *   import * as queryString from './base.js';
 *   export default queryString;
 *
 * When Babel transforms this for CJS Jest, babel-plugin-add-module-exports sets
 * `module.exports = exports.default` (the namespace from base.js). That namespace
 * carries `__esModule: true` but has no `.default` property, so a consumer compiled
 * as `interopRequireDefault(require('query-string')).default` gets `undefined`.
 *
 * This shim is set as the moduleNameMapper target for 'query-string'. It loads the
 * real package via an absolute path (built from this file's location so it points at
 * the parent repo's node_modules) so that Jest's moduleNameMapper does not intercept
 * the require (which would recurse into this file).
 */

const path = require('path');

// __dirname is <plugin>/test/mocks; the real package lives in the parent repo's
// node_modules (<repo>/node_modules/query-string), four levels up.
// eslint-disable-next-line import/no-dynamic-require
const mod = require(path.resolve(__dirname, '../../../../node_modules/query-string/index.js'));

// After the Babel + babel-plugin-add-module-exports pipeline, `mod` is the raw
// namespace object `{ __esModule: true, stringify, parse, ... }` with no `.default`.
// Recover the actual API regardless of which shape we receive.
const api = mod && mod.__esModule && typeof mod.stringify !== 'function' ? mod.default : mod;

module.exports = {
  __esModule: true,
  default: api,
};
