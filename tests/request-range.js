'use strict';

var http = require('../');
var common = require('./includes/common.js');

var assert = require('assert');

var server = common.createFooServer(false, function () {
	var options = {
		url: common.options.urlRange,
		headers: {
			range: 'bytes=0-1'
		},
		noCompress: true,
		bufferType: 'buffer'
	};
	
	http.get(options, function (err, res) {
		assert.ifError(err);
		assert.ok(res.headers['content-range']);
		assert.deepEqual(res.buffer.toString(), 'ba');
		
		server.close();
	});
});
