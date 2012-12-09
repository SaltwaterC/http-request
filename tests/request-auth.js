'use strict';

var hg = require('../');

var u = require('url');
var http = require('http');
var assert = require('assert');

var common = require('./includes/common.js');

var callback = false;

var server = common.createFooServer(false, function () {
	hg.get({url: common.options.urlAuth, bufferType: 'buffer'}, function (err, res) {
		callback = true;
		
		assert.ifError(err);
		assert.deepEqual(200, res.code);
		var auth = JSON.parse(res.buffer.toString());
		
		var url = u.parse(common.options.urlAuth);
		var urlAuth = url.auth.split(/:/);
		
		assert.deepEqual(auth.username, urlAuth[0]);
		assert.deepEqual(auth.password, urlAuth[1]);
		
		server.close();
	});	
});

process.on('exit', function () {
	assert.ok(callback);
});
