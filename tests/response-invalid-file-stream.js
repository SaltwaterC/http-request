'use strict';

var http = require('../');

var fs = require('fs');
var p = require('path');

var assert = require('assert');
var common = require('./includes/common.js');

var callback = false;

var path = p.resolve('foo.txt');

var createFile = function () {
	fs.open(path, 'w+', function (err, fd) {
		assert.ifError(err);
		fs.close(fd, function (err) {
			assert.ifError(err);
			fs.chmod(path, '0100', function (err) {
				assert.ifError(err);
				
				var server = common.createFooServer(false, function () {
					http.get({url: common.options.url, bufferType: 'buffer'}, path, function (err, res) {
						callback = true;
						assert.ok(err instanceof Error);
						assert.deepEqual(err.code, 'EACCES');
						server.close();
					});
				});
			});
		});
	});
};

fs.stat(path, function (err, stats) {
	if ( ! err) {
		fs.unlink(path, function (err, res) {
			assert.ifError(err);
			createFile();
		});
	} else {
		createFile();
	}
});

process.on('exit', function () {
	fs.unlink(path, function (err) {
		assert.ifError(err);
		assert.ok(callback);
	});
});
