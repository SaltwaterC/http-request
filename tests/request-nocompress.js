'use strict';

var assert = require('assert');
var common = require('./includes/common.js');

var callback = false;

common.executeTests(function (err, res) {
	callback = true;
	assert.ifError(err);
	assert.deepEqual(res.code, 200);
	assert.deepEqual(res.headers['content-type'], 'text/plain');
	assert.deepEqual(res.buffer.toString(), 'foo');
	assert.notEqual(res.headers['content-encoding'], 'gzip');
	assert.notEqual(res.headers['content-encoding'], 'deflate');
},{
	noCompress: true,
	bufferType: 'buffer',
	noSslVerifier: true
});

process.on('exit', function () {
	assert.ok(callback);
});
