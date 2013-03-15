'use strict';

var client = require('../');

var util = require('util');
var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	req1: 0,
	req2: 0
};

process.nextTick(function () {
	client.get({}, function (err, res) {
	});
});

process.nextTick(function () {
	client.head({}, function (err, res) {
	});
});

var i = 1;
process.on('uncaughtException', function (err) {
	assert.ok(err instanceof Error);
	assert.strictEqual(err.message, 'The options object requires an input URL value.');
	
	var req = 'req' + i;
	util.log('caught exeption for ' + req);
	callbacks[req]++;
	i++;
});

common.teardown(callbacks);
