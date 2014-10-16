'use strict';

/*global describe: true, it: true, before: true, after: true*/

var client = require('../');

var common = require('./common.js');

var assert = require('chai').assert;

describe('HTTP DELETE method tests', function() {
	var server, secureServer, proxy;

	before(function(done) {
		var servers = common.createServers(done);
		server = servers.server;
		secureServer = servers.secureServer;
		proxy = servers.proxy;
	});

	describe('DELETE: Hello World Buffer - plain', function() {
		it('should pass "Hello World" buffer', function(done) {
			client.delete({
				url: 'http://127.0.0.1:' + common.options.port + '/hello-plain',
				noCompress: true
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'the status is success');
				assert.isObject(res.headers, 'there is a headers object');
				assert.strictEqual(res.headers['x-http-method'], 'DELETE', 'the method is DELETE');
				assert.isUndefined(res.headers['content-encoding'], 'the content must not be encoded');
				assert.instanceOf(res.buffer, Buffer, 'the buffer is an instance of Buffer');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');

				done();
			});
		});
	});

	describe('DELETE: Hello World Buffer - gzip', function() {
		it('should pass "Hello World" buffer', function(done) {
			client.delete({
				url: 'http://127.0.0.1:' + common.options.port + '/hello-gzip',
				headers: {
					'accept-encoding': 'gzip'
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.headers['content-encoding'], 'gzip', 'the content is encoded with gzip');
				assert.strictEqual(res.headers['x-http-method'], 'DELETE', 'the method is DELETE');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');

				done();
			});
		});
	});

	describe('DELETE: Hello World Buffer - deflate', function() {
		it('should pass "Hello World" buffer', function(done) {
			client.delete({
				url: 'http://127.0.0.1:' + common.options.port + '/hello-deflate',
				headers: {
					'accept-encoding': 'deflate'
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.headers['content-encoding'], 'deflate', 'the content is encoded with deflate');
				assert.strictEqual(res.headers['x-http-method'], 'DELETE', 'the method is DELETE');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');

				done();
			});
		});
	});

	describe('DELETE: with no content', function() {
		it('should return a 204 response', function(done) {
			client.delete('http://127.0.0.1:' + common.options.port + '/no-content', function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 204, 'we got the proper HTTP status code');
				assert.isDefined(res.headers, 'we got the response headers');
				assert.strictEqual(res.headers['x-http-method'], 'DELETE', 'the method is DELETE');
				assert.isUndefined(res.buffer, 'we did not get back a response body');

				done();
			});
		});
	});

	after(function() {
		server.close();
		secureServer.close();
		proxy.close();
	});

});