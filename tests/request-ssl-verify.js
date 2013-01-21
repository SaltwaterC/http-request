'use strict';

var client = require('../');

var https = require('https');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0
};

var secureServer = https.createServer(common.options.secureServer, function (req, res) {
	common.response(req, res);
}).listen(common.options.securePort, function () {
	client.get({
		url: common.options.secureUrl,
		bufferType: 'buffer',
		headers: {
			host: 'http-get.lan'
		},
		ca: [require('./includes/ca.js')]
	}, function (err, res) {
		callbacks.get++;
		assert.ifError(err);
		secureServer.close();
	});
});

common.teardown(callbacks);
