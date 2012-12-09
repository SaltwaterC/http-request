'use strict';

var http = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var callback = false;

var opt = {
	url: common.options.secureUrl,
	bufferType: 'buffer',
	headers: {
		host: 'http-get.lan'
	},
	ca: [require('./includes/ca.js')]
};

var server = common.createFooServer(true, function () {
	http.get(opt, function (err, res) {
		callback = true;
		assert.ifError(err);
		server.close();
	});
});

process.on('exit', function () {
	assert.ok(callback);
});
