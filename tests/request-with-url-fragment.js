'use strict';

var client = require('../');

var u = require('url');
var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0
};

var server = http.createServer(function (req, res) {
	res.writeHead(200, {'content-type': 'text/plain'});
	res.end();
	
	assert.strictEqual(req.url, u.parse(common.options.url).pathname);
}).listen(common.options.port, function () {
	client.get(common.options.url + '#fragment', function (err, res) {
		callbacks.get++;
		server.close();
	});
});

common.teardown(callbacks);
