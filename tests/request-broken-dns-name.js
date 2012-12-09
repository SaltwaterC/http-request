'use strict';

var http = require('../');

var assert = require('assert');

var callback = {
	get1: false,
	get2: false,
	head1: false,
	head2: false
};

http.get({url: 'http://.foo.bar/', bufferType: 'buffer'}, function (err, res) {
	callback.get1 = true;
	assert.ok(err instanceof Error);
});

http.get({url: 'https://.foo.bar/', bufferType: 'buffer'}, function (err, res) {
	callback.get2 = true;
	assert.ok(err instanceof Error);
});

http.head({url: 'http://.foo.bar/'}, function (err, res) {
	callback.head1 = true;
	assert.ok(err instanceof Error);
});

http.head({url: 'https://.foo.bar/'}, function (err, res) {
	callback.head2 = true;
	assert.ok(err instanceof Error);
});

process.on('exit', function () {
	var i;
	for (i in callback) {
		if (callback.hasOwnProperty(i)) {
			assert.ok(callback[i]);
		}
	}
});
