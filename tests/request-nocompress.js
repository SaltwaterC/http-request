'use strict';

var client = require('../');

var util = require('util');
var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0
};

var server = http.createServer(function (req, res) {
	common.response(req, res);
}).listen(common.options.port, function () {
	client.get({
		url: common.options.url,
		noCompress: true,
		bufferType: 'buffer'
	}, function (err, res) {
		callbacks.get++;
		
		util.log('nocompress getting back response from foo server');
		
		assert.ifError(err);
		assert.strictEqual(res.code, 200);
		assert.strictEqual(res.headers['content-type'], 'text/plain');
		assert.strictEqual(res.buffer.toString(), 'foo');
		assert.notEqual(res.headers['content-encoding'], 'gzip');
		assert.notEqual(res.headers['content-encoding'], 'deflate');
		
		server.close();
	});
});

common.teardown(callbacks);
