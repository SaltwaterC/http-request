var http = require('../');

var fs = require('fs');
var p = require('path');

var assert = require('assert');
var common = require('./includes/common.js');

var callback = false;

var path = p.resolve('foo.txt');

try {
	fs.statSync(path);
	fs.unlinkSync(path);
} catch (e) {}

var fd = fs.openSync(path, 'w+');
fs.closeSync(fd);
fs.chmodSync(path, 0100);

var server = common.createFooServer(false, function () {
	http.get({url: common.options.url}, path, function (err, res) {
		callback = true;
		assert.ok(err instanceof Error);
		assert.deepEqual(err.code, 'EACCES');
		server.close();
	});
});

process.on('exit', function () {
	fs.unlink(path, function (err) {
		assert.ifError(err);
		assert.ok(callback);
	});
});
