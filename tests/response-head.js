'use strict';

var client = require('../');

var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	head: 0
};

var server = http.createServer(function (req, res) {
	res.writeHead(200, {'content-type': 'text/plain'});
	res.end();
}).listen(common.options.port, function () {
	client.head(common.options.url, function (err, res) {
		callbacks.head++;
		
		assert.ifError(err);
		assert.strictEqual(res.code, 200);
		assert.strictEqual(res.headers['content-type'], 'text/plain');
		
		server.close();
	});
});

common.teardown(callbacks);
