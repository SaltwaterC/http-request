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
	assert.strictEqual(err.message, 'The options object requires an input URL value.');
};

client.get({}, function (err, res) {
	callbacks.get++;
	assertions(err, res);
});

client.head({}, function (err, res) {
	callbacks.head++;
	assertions(err, res);
});

common.teardown(callbacks);
