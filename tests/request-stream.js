'use strict';

var hg = require('../');
var common = require('./includes/common.js');

var fs = require('fs');
var http = require('http');
var assert = require('assert');

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
});

server.listen(common.options.port, common.options.host, function () {
	hg.get({
		url: common.options.url,
		stream: true
	}, function (err, res) {
		var count = 0;
		
		assert.ifError(err);
		assert.deepEqual(res.headers['content-type'], 'application/octet-stream');
		assert.deepEqual(res.headers['content-length'], 10485760);
		
		res.stream.on('data', function (data) {
			count += data.length;
		});
		
		res.stream.on('end', function () {
			assert.deepEqual(count, 10485760);
			server.close();
		});
		
		res.stream.on('error', function (err) {
			server.close();
			assert.ifError(err);
		});
		
		res.stream.resume();
	});
});
