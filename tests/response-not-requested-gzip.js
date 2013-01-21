'use strict';

var client = require('../');

var http = require('http');
var zlib = require('zlib');
var semver = require('semver');
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
		bufferType: 'buffer',
		noCompress: true
	}, function (err, res) {
		callbacks.get++;
		
		if (semver.satisfies(process.version, '>=0.6.18')) {
			assert.ifError(err);
		} else {
			assert.ok(err instanceof Error);
			assert.strictEqual(err.message, 'The server sent gzip content without being requested.');
			assert.strictEqual(err.url, common.options.url);
		}
		
		server.close();
	});
});

common.teardown(callbacks);
