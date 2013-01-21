'use strict';

var client = require('../');

var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0
};

var server = http.createServer(function (req, res) {
	res.writeHead(206, {'content-type': 'text/plain', 'content-range': '0-1/3'});
	res.write('ba');
	res.end();
}).listen(common.options.port, function () {
	client.get({
		url: common.options.url,
		headers: {
			range: 'bytes=0-1'
		},
		noCompress: true,
		bufferType: 'buffer'
	}, function (err, res) {
		callbacks.get++;
		
		assert.ifError(err);
		assert.ok(res.headers['content-range']);
		assert.strictEqual(res.buffer.toString(), 'ba');
		
		server.close();
	});
});

common.teardown(callbacks);
