'use strict';

var hg = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var http = require('http');

var callback = {
	get: false,
	head: false
};

var assertions = function (err, res) {
	assert.ok(err instanceof Error);
	assert.deepEqual(err.message, 'Redirect loop detected after 10 requests.');
	assert.deepEqual(err.code, 301);
};

var server = http.createServer(function (req, res) {
	res.writeHead(301, {location: '/'});
	res.end();
});

server.listen(common.options.port, common.options.host, function () {
	hg.get({url: common.options.url, bufferType: 'buffer'}, function (err, res) {
		callback.get = true;
		assertions(err, res);
		hg.head({url: common.options.url}, function (err, res) {
			callback.head = true;
			assertions(err, res);
			server.close();
		});
	});
});

process.on('exit', function () {
	var i;
	for (i in callback) {
		if (callback.hasOwnProperty(i)) {
			assert.ok(callback[i]);
		}
	}
});
