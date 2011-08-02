var fs = require('fs');
var p = require('path');
var exec = require('child_process').exec;

var assert = require('assert');
var common = require('./includes/common.js');

var path = p.resolve('foo.txt');

try {
	fs.statSync(path);
	fs.unlinkSync(path);
} catch (e) {}

var fd = fs.openSync(path, 'w+');
fs.closeSync(fd);
fs.chmodSync(path, 0100);

common.executeTests(function (err, res) {
	assert.ok(err instanceof Error);
	assert.equal(err.errno, 13);
	assert.deepEqual(err.code, 'EACCES');
}, {}, false, path);

process.on('exit', function () {
	fs.unlink(path, function (err) {
		assert.ifError(err);
	});
});
