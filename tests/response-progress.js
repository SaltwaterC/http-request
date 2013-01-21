'use strict';

var client = require('../');

var http = require('http');
var https = require('https');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0,
	progress: 0
};

var server = http.createServer(function (req, res) {
	common.response(req, res);
}).listen(common.options.port, function () {
	client.get({
		url: common.options.url,
		bufferType: 'buffer',
		progress: function (current, total) {
			callbacks.progress++;
			assert.strictEqual(current, 3);
			// the test server does not return the Content-Length header
			assert.strictEqual(total, 0);
		}
	}, function (err, res) {
		callbacks.get++;
		
		assert.ifError(err);
		assert.strictEqual(res.code, 200);
		assert.strictEqual(res.headers['content-type'], 'text/plain');
		assert.strictEqual(res.buffer.toString(), 'foo');
		
		server.close();
	});
});

common.teardown(callbacks);
