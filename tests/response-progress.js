'use strict';

var assert = require('assert');
var common = require('./includes/common.js');

var callback = false;
var progress = false;

common.executeTests(function (err, res) {
		callback = true;
		assert.ifError(err);
		assert.deepEqual(res.code, 200);
		assert.deepEqual(res.headers['content-type'], 'text/plain');
		assert.deepEqual(res.buffer.toString(), 'foo');
	},{
		progress: function (current, total) {
			progress = true;
			assert.deepEqual(current, 3);
			// the test server does not return the Content-Length header
			assert.deepEqual(total, 0);
		},
		bufferType: 'buffer',
		noSslVerifier: true
});

process.on('exit', function () {
	assert.ok(callback);
	assert.ok(progress);
});
