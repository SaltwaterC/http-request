'use strict';

var client = require('../');

var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get: 0,
	head: 0
};

var assertions = function (err, res) {
	assert.ok(err instanceof Error);
	assert.strictEqual(err.code, 'ENOTFOUND');
	assert.strictEqual(err.url, 'http://foo.bar/');
};

client.get({url: 'http://foo.bar/', bufferType: 'buffer'}, function (err, res) {
	callbacks.get++;
	assertions(err, res);
});

client.head({url: 'http://foo.bar/'}, function (err, res) {
	callbacks.head++;
	assertions(err, res);
});

common.teardown(callbacks);
