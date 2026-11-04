// Test-only: the app's catalogue imports the i18n module, which imports
// react-native for right-to-left support. Node cannot load react-native, and
// these tests never touch it, so it is replaced by an empty stand-in.
const Module = require('module');
const path = require('path');
const stub = path.join(__dirname, 'react-native-stub.cjs');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'react-native') return stub;
  return resolve.call(this, request, ...rest);
};
// image assets (require('…/x.webp')) resolve to a number in the app; here, to their path
for (const ext of ['.webp', '.png', '.jpg', '.jpeg']) require.extensions[ext] = (m, filename) => { m.exports = filename; };
