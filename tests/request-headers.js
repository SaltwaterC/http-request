'use strict';

var client = require('../');

var http = require('http');
var https = require('https');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	http: 0,
	https: 0
};

var asserts = function (err, res) {
	assert.ifError(err);
	assert.strictEqual(res.code, 200);
	assert.strictEqual(res.headers['content-type'], 'text/plain');
	assert.strictEqual(res.headers.foo, 'bar');
	assert.strictEqual(res.buffer.toString(), 'foo');
};

var clientOptions = {
	headers: {
		foo: 'bar',
	},
	bufferType: 'buffer',
	noSslVerifier: true
};

var serverResponse = function (req, res) {
	if (req.headers.foo) {
		res.setHeader('foo', req.headers.foo);
	}
	
	common.response(req, res);
};

var server = http.createServer(function (req, res) {
	serverResponse(req, res);
}).listen(common.options.port, function () {
	clientOptions.url = common.options.url;
	client.get(clientOptions, function (err, res) {
		callbacks.http++;
		asserts(err, res);
		server.close();
	});
});

var secureServer = https.createServer(common.options.secureServer, function (req, res) {
	serverResponse(req, res);
}).listen(common.options.securePort, function () {
	clientOptions.url = common.options.secureUrl;
	client.get(clientOptions, function (err, res) {
		callbacks.https++;
		asserts(err, res);
		secureServer.close();
	});
});

common.teardown(callbacks);
