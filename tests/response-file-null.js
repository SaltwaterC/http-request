'use strict';

var client = require('../');

var http = require('http');
var util = require('util');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	direct: 0,
	redirect: 0
};

var asserts, requests = 2;

var server = http.createServer(function (req, res) {
	if (req.url === '/redirect') {
		res.writeHead(302, {location: common.options.url});
		res.end();
	} else {
		common.response(req, res);
	}
}).listen(common.options.port, function () {
	client.get({url: common.options.url}, null, function (err, res) {
		callbacks.direct++;
		asserts(err, res);
	});
	
	client.get({url: common.options.url + 'redirect'}, null, function (err, res) {
		callbacks.redirect++;
		asserts(err, res);
	});
});

asserts = function (err, res) {
	requests--;
		
	if (requests === 0) {
		server.close();
	}
	
	assert.ifError(err);
	assert.strictEqual(200, res.code);
	assert.ok(res.headers);
};

common.teardown(callbacks);
