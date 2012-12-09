'use strict';

var fs = require('fs');

var assert = require('assert');
var common = require('./includes/common.js');

var callback = [false, false];
var index = 0;

common.executeTests(function (err, res) {
	callback[index] = true;
	index++;
	assert.ifError(err);
	assert.deepEqual(res.code, 200);
	assert.deepEqual(res.headers['content-type'], 'text/plain');
	fs.stat(res.file, function (err) {
		assert.ifError(err);
		fs.readFile(res.file, function (err, data) {
			assert.ifError(err);
			assert.deepEqual(data.toString(), 'foo');
			fs.unlink(res.file, function (err) {
				assert.ifError(err);
			});
		});
	});
}, {
	bufferType: 'buffer',
	noSslVerifier: true
}, false, true);

process.on('exit', function () {
	var i;
	for (i in callback) {
		if (callback.hasOwnProperty(i)) {
			assert.ok(callback[i]);
		}
	}
});
