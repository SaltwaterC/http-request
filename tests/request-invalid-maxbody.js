'use strict';

var hg = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var http = require('http');

var callback = false;

var server = http.createServer(function (req, res) {
	res.writeHead(200);
	res.end();
});

server.listen(common.options.port, common.options.host, function () {
	hg.get({
		url: common.options.url,
		maxBody: 'foo'
	}, function (err, res) {
		callback = true;
		assert.ok(err instanceof Error);
		assert.deepEqual(err.message, 'Invalid options.maxBody specification.');
		server.close();
	});
});

process.on('exit', function () {
	assert.ok(callback);
});
