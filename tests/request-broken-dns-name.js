'use strict';

var client = require('../');

var assert = require('assert');

var common = require('./includes/common.js');

var callbacks = {
	get1: 0,
	get2: 0,
	head1: 0,
	head2: 0
};

client.get('http://.foo.bar/', function (err, res) {
	callbacks.get1++;
	assert.ok(err instanceof Error);
	assert.strictEqual(err.url, 'http://.foo.bar/');
});

client.get('https://.foo.bar/', function (err, res) {
	callbacks.get2++;
	assert.ok(err instanceof Error);
	assert.strictEqual(err.url, 'https://.foo.bar/');
});

client.head({url: 'http://.foo.bar/'}, function (err, res) {
	callbacks.head1++;
	assert.ok(err instanceof Error);
	assert.strictEqual(err.url, 'http://.foo.bar/');
});

client.head({url: 'https://.foo.bar/'}, function (err, res) {
	callbacks.head2++;
	assert.ok(err instanceof Error);
	assert.strictEqual(err.url, 'https://.foo.bar/');
});

common.teardown(callbacks);
