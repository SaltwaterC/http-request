'use strict';

/*global describe: true, it: true, before: true, after: true*/

var client = require('../');
var common = require('./common.js');

var assert = require('chai').assert;

describe('HTTP GET method tests', function () {
	var server;
	
	before(function (done) {
		server = common.createHttpServer();
		
		server.listen(common.options.port, function () {
			done();
		});
	});
	
	describe('GET Hello World Buffer - plain', function () {
		it('should pass "Hello World" buffer', function (done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/',
				noCompress: true
			}, function (err, res) {
				assert.isNull(err, 'we have an error');
				
				assert.strictEqual(res.code, 200, 'the status is success');
				assert.typeOf(res.headers, 'object', 'there is a headers object');
				assert.isUndefined(res.headers['content-encoding'], 'the content must not be encoded');
				assert.instanceOf(res.buffer, Buffer, 'the buffer is an instance of Buffer');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');
				
				done();
			});
		});
	});
	
	describe('GET Hello World Buffer - gzip', function () {
		it('should pass "Hello World" buffer', function (done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/',
				headers: {
					'accept-encoding': 'gzip'
				}
			}, function (err, res) {
				assert.isNull(err, 'we have an error');
				
				assert.strictEqual(res.headers['content-encoding'], 'gzip', 'the content is encoded with gzip');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');
				
				done();
			});
		});
	});
	
	describe('GET Hello World Buffer - deflate', function () {
		it('should pass "Hello World" buffer', function (done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/',
				headers: {
					'accept-encoding': 'deflate'
				}
			}, function (err, res) {
				assert.isNull(err, 'we have an error');
				
				assert.strictEqual(res.headers['content-encoding'], 'deflate', 'the content is encoded with deflate');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');
				
				done();
			});
		});
	});
	
	
	
	after(function () {
		server.close();
	});
});
