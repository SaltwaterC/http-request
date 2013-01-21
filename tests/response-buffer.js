'use strict';

var client = require('../');

var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0
};

var server = http.createServer(function (req, res) {
	common.response(req, res);
}).listen(common.options.port, function () {
	client.get({
		url: common.options.url,
		bufferType: 'buffer',
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
