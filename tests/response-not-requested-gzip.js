'use strict';

var hg = require('../');

var semver = require('semver');

var assert = require('assert');
var zlib = require('zlib');
var common = require('./includes/common.js');

var http = require('http');

var callback = false;

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
});

server.listen(common.options.port, common.options.host, function () {
	hg.get({
		url: common.options.url,
		noCompress: true,
		bufferType: 'buffer'
	}, function (err, res) {
		callback = true;
		if (semver.satisfies(process.version, '>=0.6.18')) {
			assert.ifError(err);
		} else {
			assert.ok(err instanceof Error);
			assert.deepEqual(err.message, 'The server sent gzip content without being requested.');
		}
		server.close();
	});
});

process.on('exit', function () {
	assert.ok(callback);
});
