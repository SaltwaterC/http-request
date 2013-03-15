'use strict';

var client = require('../');

var fs = require('fs');
var p = require('path');
var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var path = p.resolve('foo.txt');

var callbacks = {
	get: 0
};

var createFile = function () {
	fs.open(path, 'w+', function (err, fd) {
		assert.ifError(err);
		fs.close(fd, function (err) {
			assert.ifError(err);
			fs.chmod(path, '0100', function (err) {
				assert.ifError(err);
				
				var server = http.createServer(function (req, res) {
					common.response(req, res);
				}).listen(common.options.port, function () {
					client.get(common.options.url, path, function (err, res) {
						callbacks.get++;
						
						assert.ok(err instanceof Error);
						assert.strictEqual(err.code, 'EACCES');
						assert.strictEqual(err.url, common.options.url);
						
						server.close();
						
						fs.unlink(path, function (err) {
							assert.ifError(err);
						});
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

common.teardown(callbacks);
