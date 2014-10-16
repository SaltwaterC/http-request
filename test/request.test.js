'use strict';

/*global describe: true, it: true*/

var client = require('../');

var assert = require('chai').assert;

describe('Request Class tests', function() {

	describe('Request: instance without options', function() {
		it('should throw a TypeError', function(done) {
			assert.throws(function() {
				client.createHttpClient();
			}, TypeError, 'Parameter \'options\' must be an object, not undefined');

			done();
		});
	});

	describe('Request: instance without options.url', function() {
		it('should throw a TypeError', function(done) {
			assert.throws(function() {
				client.createHttpClient({});
			}, TypeError, 'Parameter \'options.url\' must be a string, not undefined');

			done();
		});
	});

	describe('Request: instance without options.method', function() {
		it('should throw a TypeError', function(done) {
			assert.throws(function() {
				client.createHttpClient({
					url: ''
				});
			}, TypeError, 'Parameter \'options.method\' must be a string, not undefined');

			done();
		});
	});

});