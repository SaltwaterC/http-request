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
		maxBody: 2
	}, function (err, res) {
		callbacks.get++;
		
		assert.ok(err instanceof Error);
		assert.strictEqual(err.message, 'Large body detected.');
		assert.strictEqual(err.code, 200);
		
		server.close();
	});
});

common.teardown(callbacks);
