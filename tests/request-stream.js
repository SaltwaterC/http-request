'use strict';

var client = require('../');

var fs = require('fs');
var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0
};

var server = http.createServer(function (req, res) {
	res.writeHead(200, {
		'content-type': 'application/octet-stream',
		'content-length': 10485760
	});
	
	var rs = fs.createReadStream('/dev/urandom', {start:0, end: 10485759});
	
	rs.on('data', function (data) {
		res.write(data);
	});
    
	rs.on('end', function () {
		res.end();
	});
}).listen(common.options.port, function () {
	client.get({
		url: common.options.url,
		stream: true
	}, function (err, res) {
		callbacks.get++;
		var count = 0;
		
		assert.ifError(err);
		assert.strictEqual(res.code, 200);
		assert.strictEqual(res.headers['content-type'], 'application/octet-stream');
		assert.deepEqual(res.headers['content-length'], 10485760);
		
		res.stream.on('data', function (data) {
			count += data.length;
		});
		
		res.stream.on('end', function () {
			assert.strictEqual(count, 10485760);
			server.close();
		});
		
		res.stream.on('error', function (err) {
			server.close();
			assert.ifError(err);
		});
		
		res.stream.resume();
	});
});

common.teardown(callbacks);
