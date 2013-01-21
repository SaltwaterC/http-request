'use strict';

var client = require('../');

var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0
};

var server = http.createServer(function (req, res) {
	res.writeHead(200);
	res.end();
});

server.listen(common.options.port, common.options.host, function () {
	client.get({
		url: common.options.url,
		maxBody: 'foo'
	}, function (err, res) {
		callbacks.get++;
		
		assert.ok(err instanceof Error);
		assert.strictEqual(err.message, 'Invalid options.maxBody specification.');
		assert.strictEqual(err.url, common.options.url);
		
		server.close();
	});
});

common.teardown(callbacks);
