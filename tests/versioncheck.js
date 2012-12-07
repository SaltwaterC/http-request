var assert = require('assert');

var conf = require('../lib/config.js');
var pack = require('../package.json');

assert.deepEqual(pack.version, conf.version);
