'use strict';

var client = require('../');

var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0
};

var server = http.createServer(function (req, res) {
	res.writeHead(404, {'content-type': 'text/plain'});
	res.end('Not Found');
}).listen(common.options.port, function () {
	client.get({
		url: common.options.url,
		bufferType: 'buffer'
	}, function (err, res) {
		callbacks.get++;
		
		assert.ok(err instanceof Error);
		assert.strictEqual(err.document.toString(), 'Not Found');
		assert.strictEqual(err.largeDocument, false);
		assert.strictEqual(err.url, common.options.url);
		
		server.close();
	});
});

common.teardown(callbacks);
