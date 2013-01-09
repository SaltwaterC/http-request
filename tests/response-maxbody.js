'use strict';

var assert = require('assert');
var common = require('./includes/common.js');

var callback = [false, false];
var index = 0;

common.executeTests(function (err, res) {
		console.log(err, res);
		callback[index] = true;
		index++;
		assert.ok(err instanceof Error);
		assert.deepEqual(err.message, 'Large body detected.');
		assert.deepEqual(err.code, 200);
		
		if (index === 1) {
			assert.deepEqual(err.url, common.options.url);
		}
		
		if (index === 2) {
			assert.deepEqual(err.url, common.options.secureUrl);
		}
	},
	{
		maxBody: 2,
		bufferType: 'buffer',
		noSslVerifier: true
});

process.on('exit', function () {
	var i;
	for (i in callback) {
		if (callback.hasOwnProperty(i)) {
			assert.ok(callback[i]);
		}
	}
});
