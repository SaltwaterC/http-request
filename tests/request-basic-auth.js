'use strict';

var client = require('../');

var u = require('url');
var util = require('util');
var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	getGzip: 0,
	getDeflate: 0,
	getPlain: 0
};

var asserts, requests = 3;

var server = http.createServer(function (req, res) {
	// basic HTTP Basic Auth parser
	var authorization = req.headers.authorization || '';
	var token = authorization.split(/\s+/).pop() || '';
	var auth = new Buffer(token, 'base64').toString();
	auth = auth.split(/:/);
	
	var content = JSON.stringify({
		username: auth[0],
		password: auth[1]
	});
	
	common.response(req, res, content, 'application/json');
}).listen(common.options.port, function () {
	client.get({
		url: common.options.urlAuth,
		bufferType: 'buffer',
		headers: {
			'accept-encoding': 'gzip'
		}
	}, function (err, res) {
		util.log('basic-auth recieving response for gzip');
		callbacks.getGzip++;
		asserts(err, res);
	});
	
	client.get({
		url: common.options.urlAuth,
		bufferType: 'buffer',
		headers: {
			'accept-encoding': 'deflate'
		}
	}, function (err, res) {
		util.log('basic-auth recieving response for deflate');
		callbacks.getDeflate++;
		asserts(err, res);
	});
	
	client.get({
		url: common.options.urlAuth,
		bufferType: 'buffer',
		noCompress: true // plain
	}, function (err, res) {
		util.log('basic-auth recieving response for plain');
		callbacks.getPlain++;
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
	var auth = JSON.parse(res.buffer.toString());
	
	var url = client.parseUrl(common.options.urlAuth); // http.parseUrl - undocumented, therefore don't rely on it
	var urlAuth = url.auth.split(/:/);
	
	assert.strictEqual(auth.username, urlAuth[0]);
	assert.strictEqual(auth.password, urlAuth[1]);
};

common.teardown(callbacks);
