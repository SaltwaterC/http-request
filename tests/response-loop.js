'use strict';

var client = require('../');

var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0,
	head: 0
};

var assertions, requests = 2;

var server = http.createServer(function (req, res) {
	res.writeHead(301, {location: '/'});
	res.end();
}).listen(common.options.port, function () {
	client.get({
		url: common.options.url,
		bufferType: 'buffer'
	}, function (err, res) {
		callbacks.get++;
		assertions(err, res);
	});
	
	client.head(common.options.url, function (err, res) {
		callbacks.head++;
		assertions(err, res);
	});
});

assertions = function (err, res) {
	requests--;
		
	if (requests === 0) {
		server.close();
	}
		
	assert.ok(err instanceof Error);
	assert.strictEqual(err.message, 'Redirect loop detected after 10 requests.');
	assert.strictEqual(err.code, 301);
	assert.strictEqual(err.url, common.options.url);
};

common.teardown(callbacks);
