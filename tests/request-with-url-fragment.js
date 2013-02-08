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
	
	assert.strictEqual(req.url, client.parseUrl(common.options.url).pathname); // http.parseUrl - undocumented, therefore don't rely on it
}).listen(common.options.port, function () {
	client.get({
		url: common.options.url + '#fragment',
		bufferType: 'buffer'
	}, function (err, res) {
		callbacks.get++;
		server.close();
	});
});

common.teardown(callbacks);
