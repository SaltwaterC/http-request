'use strict';

var hg = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var u = require('url');
var http = require('http');

var callback = false;

var server = http.createServer(function (req, res) {
	res.writeHead(200, {'content-type': 'text/plain'});
	res.end();
	
	assert.deepEqual(req.url, u.parse(common.options.url).pathname);
});

server.listen(common.options.port, common.options.host, function () {
	hg.get({
		url: common.options.url + '#fragment',
		bufferType: 'buffer'
	}, function (err, res) {
		callback = true;
		server.close();
	});
});

process.on('exit', function () {
	assert.ok(callback);
});
