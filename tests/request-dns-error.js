'use strict';

var http = require('../');

var assert = require('assert');

var callback = {
	get: false,
	head: false
};

var assertions = function (err, res) {
	assert.ok(err instanceof Error);
	assert.deepEqual(err.code, 'ENOTFOUND');
};

http.get({url: 'http://foo.bar/', bufferType: 'buffer'}, function (err, res) {
	callback.get = true;
	assertions(err, res);
});

http.head({url: 'http://foo.bar/'}, function (err, res) {
	callback.head = true;
	assertions(err, res);
});

process.on('exit', function () {
	var i;
	for (i in callback) {
		if (callback.hasOwnProperty(i)) {
			assert.ok(callback[i]);
		}
	}
});
