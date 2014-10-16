'use strict';

/*global describe: true, it: true, before: true, after: true*/

var client = require('../');

var common = require('./common.js');

var fs = require('fs');
var assert = require('chai').assert;

describe('HTTP PUT method tests', function() {
	var server, secureServer, proxy, fileServer;

	before(function(done) {
		var servers = common.createServers(function() {
			fileServer = common.createFileServer(done);
		});
		server = servers.server;
		secureServer = servers.secureServer;
		proxy = servers.proxy;
	});

	describe('PUT: buffer', function() {
		it('should make a succesful PUT request', function(done) {
			client.put({
				url: 'http://127.0.0.1:' + common.options.port + '/put',
				reqBody: new Buffer('Hello World')
			}, function(err, res) {
				assert.ifError(err);

				assert.strictEqual(res.code, 200);
				assert.strictEqual(res.headers['x-http-method'], 'PUT');
				assert.strictEqual(res.headers['x-content-type'], 'text/plain');
				assert.strictEqual(res.buffer.toString(), 'Hello World');

				done();
			});
		});
	});

	describe('PUT: file', function() {
		it('should make a succesful PUT request', function(done) {
			client.put({
				url: 'http://127.0.0.1:' + common.options.port + '/put',
				reqBody: fs.createReadStream(process.cwd() + '/test/data/pdf.foo')
			}, function(err, res) {
				assert.ifError(err);

				assert.strictEqual(res.code, 200);
				assert.strictEqual(res.headers['x-http-method'], 'PUT');
				assert.strictEqual(res.headers['x-content-type'], 'application/pdf');
				assert.strictEqual(res.headers['x-content-length'], '11524');

				done();
			});
		});
	});

	describe('PUT: pipe http.IncomingMessage', function() {
		it('should make a succesful PUT request', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.filePort + '/bzip2.foo',
				stream: true
			}, function(err, str) {
				assert.ifError(err);

				assert.strictEqual(str.code, 200);
				assert.strictEqual(str.headers['content-type'], 'application/x-bzip2');

				client.put({
					url: 'http://127.0.0.1:' + common.options.port + '/put',
					reqBody: str.stream
				}, function(err, res) {
					assert.ifError(err);

					assert.strictEqual(res.code, 200);
					assert.strictEqual(res.headers['x-http-method'], 'PUT');
					assert.strictEqual(res.headers['x-content-type'], 'application/x-bzip2');
					assert.strictEqual(res.headers['x-content-length'], '44');

					done();
				});
			});
		});
	});

	after(function() {
		server.close();
		secureServer.close();
		proxy.close();
		fileServer.close();
	});

});