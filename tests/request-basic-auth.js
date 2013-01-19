'use strict';

var client = require('../');

var u = require('url');
var zlib = require('zlib');
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
	var encoding = common.resEnc(req, res);
	res.writeHead(200, {'content-type': 'application/json'});
	
	// a pretty basic HTTP Basic Auth parser :)
	var authorization = req.headers.authorization || '';
	var token = authorization.split(/\s+/).pop() || '';
	var auth = new Buffer(token, 'base64').toString();
	auth = auth.split(/:/);
	
	var response = JSON.stringify({
		username: auth[0],
		password: auth[1]
	});
	
	switch (encoding) {
		case 'gzip':
			util.log('basic-auth sending response for gzip');
			zlib.gzip(response, function (err, compressed) {
				if ( ! err) {
					res.write(compressed);
				} else {
					res.writeHead(500, {'content-type': 'text/plain'});
				}
				res.end();
			});
		break;
		
		case 'deflate':
			util.log('basic auth sending response for deflate');
			zlib.deflate(response, function (err, compressed) {
				if ( ! err) {
					res.write(compressed);
				} else {
					res.writeHead(500, {'content-type': 'text/plain'});
				}
				res.end();
			});
		break;
		
		default:
			util.log('basic-auth sending response for plain');
			res.write(response);
			res.end();
		break;
	}
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
	assert.deepEqual(200, res.code);
	var auth = JSON.parse(res.buffer.toString());
	
	var url = u.parse(common.options.urlAuth);
	var urlAuth = url.auth.split(/:/);
	
	assert.deepEqual(auth.username, urlAuth[0]);
	assert.deepEqual(auth.password, urlAuth[1]);
};

common.teardown(callbacks);
