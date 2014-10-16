'use strict';

/*global describe: true, it: true, before: true, after: true*/

var client = require('../');

var common = require('./common.js');

var qs = require('querystring');
var assert = require('chai').assert;

describe('HTTP POST method tests', function() {
	var server, secureServer, proxy;

	before(function(done) {
		var servers = common.createServers(done);
		server = servers.server;
		secureServer = servers.secureServer;
		proxy = servers.proxy;
	});

	describe('POST: request shorthand', function() {
		it('should pass the arguments as query string into the request body', function(done) {
			client.post('http://127.0.0.1:' + common.options.port + '/post?foo=bar&baz=q u x', function(err, res) {
				assert.ifError(err);

				assert.strictEqual(res.headers['x-http-method'], 'POST', 'the method is POST');
				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.buffer.toString(), 'foo=bar&baz=q%20u%20x', 'we got back the request body');
				assert.strictEqual(res.headers['x-content-type'], 'application/x-www-form-urlencoded;charset=utf-8', 'we got back the original content-type header');
				assert.strictEqual(res.headers['x-content-length'], '21', 'we got back the content-length header');

				done();
			});
		});
	});

	describe('POST: request with application/x-www-form-urlencoded', function() {
		it('should pass the proper request body as querystring with URL encoding', function(done) {
			client.post({
				url: 'http://127.0.0.1:' + common.options.port + '/post',
				reqBody: new Buffer(qs.stringify({
					foo: 'bar',
					baz: 'q u x'
				})),
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
					wibble: 'wobble'
				}
			}, function(err, res) {
				assert.ifError(err);

				assert.strictEqual(res.headers['x-http-method'], 'POST', 'the method is POST');
				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.buffer.toString(), 'foo=bar&baz=q%20u%20x', 'we got back the request body');
				assert.strictEqual(res.headers.wibble, 'wobble', 'the custom header was passed back properly');
				assert.strictEqual(res.headers['x-content-type'], 'application/x-www-form-urlencoded', 'we got back the original content-type header');
				assert.strictEqual(res.headers['x-content-length'], '21', 'we got back the content-length header');

				done();
			});
		});
	});

	describe('POST: request with multipart/form-data', function() {
		it('should pass the proper request body', function(done) {
			var form = new client.FormData();

			form.append('foo', 'bar');
			form.append('baz', 'q u x');

			client.post({
				url: 'http://127.0.0.1:' + common.options.port + '/post',
				reqBody: form,
				headers: {
					wibble: 'wobble'
				}
			}, function(err, res) {
				assert.ifError(err);

				assert.strictEqual(res.headers['x-http-method'], 'POST', 'the method is POST');
				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['x-content-type'], 'multipart/form-data; boundary=' + form.getBoundary(), 'we got back the original content-type header');
				assert.strictEqual(res.headers.wibble, 'wobble', 'the custom header was passed back properly');
				assert.strictEqual(res.buffer.toString(), 'foo=bar&baz=q%20u%20x', 'we got back the parsed request body');
				assert.strictEqual(res.headers['x-content-length'], '266', 'we got back the content-length header');

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