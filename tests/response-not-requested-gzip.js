'use strict';

var client = require('../');

var http = require('http');
var zlib = require('zlib');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0
};

var server = http.createServer(function (req, res) {
	res.setHeader('content-encoding', 'gzip');
	res.writeHead(200, {'content-type': 'text/plain'});
	zlib.gzip('foo', function (err, compressed) {
		if ( ! err) {
			res.write(compressed);
		} else {
			res.writeHead(500, {'content-type': 'text/plain'});
		}
		res.end();
	});
}).listen(common.options.port, function () {
	client.get({
		url: common.options.url,
		noCompress: true
	}, function (err, res) {
		callbacks.get++;
		assert.ifError(err);
		server.close();
	});
});

common.teardown(callbacks);
