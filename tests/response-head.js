'use strict';

var client = require('../');

var http = require('http');
var util = require('util');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	head: 0
};

var server = http.createServer(function (req, res) {
	res.writeHead(200, {'content-type': 'text/plain'});
	res.end();
	
	util.log('http.server response');
}).listen(common.options.port, function () {
	util.log('http.createServer.listen');
	
	client.head(common.options.url, function (err, res) {
		callbacks.head++;
		assert.ifError(err);
		
		util.log('http.head');
		
		assert.strictEqual(res.code, 200);
		assert.strictEqual(res.headers['content-type'], 'text/plain');
		
		server.close();
		util.log('http.createServer.close');
	});
});

common.teardown(callbacks);
