var fs = require('fs');
var p = require('path');

var assert = require('assert');
var common = require('./includes/common.js');

var path = p.resolve('foo.txt');

common.executeTests(function (err, res) {
	assert.ifError(err);
	assert.deepEqual(res.code, 200);
	assert.deepEqual(res.headers['content-type'], 'text/plain');
	assert.deepEqual(res.headers['content-encoding'], 'gzip');
	assert.deepEqual(res.file, path);
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
}, {}, false, path);
