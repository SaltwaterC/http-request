'use strict';

var client = require('../');

var fs = require('fs');
var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var file = 'bar.txt';

var callbacks = {
	get: 0
};

var server = http.createServer(function (req, res) {
	common.response(req, res);
}).listen(common.options.port, function () {
	client.get(common.options.url, file, function (err, res) {
		callbacks.get++;
		
		assert.ifError(err);
		assert.strictEqual(res.code, 200);
		assert.strictEqual(res.headers['content-type'], 'text/plain');
		
		server.close();
		
		fs.stat(res.file, function (err) {
			assert.ifError(err);
			
			fs.readFile(res.file, function (err, data) {
				assert.ifError(err);
				assert.strictEqual(data.toString(), 'foo');
				
				fs.unlink(res.file, function (err) {
					assert.ifError(err);
				});
			});
		});
	});
});

common.teardown(callbacks);
