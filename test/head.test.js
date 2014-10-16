'use strict';

/*global describe: true, it: true, before: true, after: true*/

var client = require('../');
var config = require('../package.json');

var common = require('./common.js');

var util = require('util');
var assert = require('chai').assert;

describe('HTTP HEAD method tests', function() {
	var server, secureServer, proxy;

	before(function(done) {
		var servers = common.createServers(done);
		server = servers.server;
		secureServer = servers.secureServer;
		proxy = servers.proxy;
	});

	describe('HEAD: Hello World - plain', function() {
		it('should pass the response headers', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/hello-plain',
				noCompress: true,
				noRedirect: true
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'the status is success');
				assert.isObject(res.headers, 'there is a headers object');
				assert.isUndefined(res.headers['content-encoding'], 'the content must not be encoded');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: Hello World - gzip', function() {
		it('should pass the response headers', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/hello-gzip',
				headers: {
					'accept-encoding': 'gzip'
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.headers['content-encoding'], 'gzip', 'the content is encoded with gzip');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: Hello World - deflate', function() {
		it('should pass the response headers', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/hello-deflate',
				headers: {
					'accept-encoding': 'deflate'
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.headers['content-encoding'], 'deflate', 'the content is encoded with deflate');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: redirect without location header', function() {
		it('should return the error argument', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/redirect-without-location',
				noCompress: true
			}, function(err, res) {
				assert.instanceOf(err, Error, 'the error is an Error instance');
				assert.strictEqual(err.code, 301, 'the error code should be equal to the HTTP status code');
				assert.strictEqual(err.url, 'http://127.0.0.1:' + common.options.port + '/redirect-without-location', 'the URL must be passed back to the completion callback');
				assert.strictEqual(err.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				assert.isUndefined(res);

				done();
			});
		});
	});

	describe('HEAD: broken DNS name over HTTP', function() {
		it('should fail with an error passed back to the completion callback', function(done) {
			client.head('http://.foo.bar/', function(err, res) {
				assert.instanceOf(err, Error, 'the error is an Error instance');
				assert.strictEqual(err.url, 'http://.foo.bar/');

				assert.isUndefined(res, 'we have a response');

				done();
			});
		});
	});

	describe('HEAD: broken DNS name over HTTPS', function() {
		it('should fail with an error passed back to the completion callback', function(done) {
			client.head('https://.foo.bar/', function(err, res) {
				assert.instanceOf(err, Error, 'the error is an Error instance');
				assert.strictEqual(err.url, 'https://.foo.bar/');

				assert.isUndefined(res, 'we have a response');

				done();
			});
		});
	});

	describe('HEAD: DNS error', function() {
		it('should fail with an error passed back to the completion callback', function(done) {
			client.head('http://wibble.wobble/', function(err, res) {
				assert.instanceOf(err, Error, 'the error is an Error instance');
				assert.strictEqual(err.code, 'ENOTFOUND');
				assert.strictEqual(err.url, 'http://wibble.wobble/');

				assert.isUndefined(res, 'we have a response');

				done();
			});
		});
	});

	describe('HEAD: header reflect', function() {
		it('should pass back the header foo sent from the client', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/header-reflect',
				headers: {
					foo: 'bar'
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.headers.foo, 'bar', 'we got the foo header back');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: without protocol prefix', function() {
		it('should work fine by prepending http:// to the URL', function(done) {
			client.head('127.0.0.1:' + common.options.port + '/no-protocol-prefix', function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'the HTTP status code is OK');
				assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: with redirect', function() {
		it('should redirect succesfully', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/redirect',
				noCompress: true
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got back the proper HTTP status code');
				assert.strictEqual(res.url, 'http://127.0.0.1:' + common.options.port + '/redirect-target', 'we got back the proper URL');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: over HTTPS with SSL validation', function() {
		it('should verify succesfully the connection', function(done) {
			client.head({
				url: 'https://127.0.0.1:' + common.options.securePort + '/ssl-validation',
				headers: {
					host: 'http-get.lan'
				},
				ca: [require('./ca.js')]
			}, function(err, res) {
				assert.isNull(err);

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: without url', function() {
		it('should throw an error', function(done) {
			assert.throws(function() {
				client.head({}, function(err) {
					assert.ifError(err);
				});
			}, TypeError, 'Parameter \'options.url\' must be a string, not undefined');

			done();
		});
	});

	describe('HEAD: with redirect loop', function() {
		it('should detect the condition and pass the error argument to the completion callback', function(done) {
			var url = 'http://127.0.0.1:' + common.options.port + '/redirect-loop';

			client.head(url, function(err, res) {
				assert.instanceOf(err, Error, 'the error is an instance of Error');
				assert.strictEqual(err.message, 'Redirect loop detected after 12 requests.', 'the proper message is passed back to the user');
				assert.strictEqual(err.code, 301, 'the error code is equal to the code of the HTTP response');
				assert.strictEqual(err.url, url, 'the error object has the proper URL');
				assert.strictEqual(err.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				assert.isUndefined(res, 'we have a response');

				done();
			});
		});
	});

	describe('HEAD: with URL fragment', function() {
		it('should not send the URL fragment to the server', function(done) {
			client.head('http://127.0.0.1:' + common.options.port + '/path-reflect#fragment', function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.headers.path, '/path-reflect', 'we should not get back the fragment');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: with noSslVerifier', function() {
		it('should not pass an error back due to lack of root CA', function(done) {
			client.head({
				url: 'https://127.0.0.1:' + common.options.securePort + '/no-ssl-verifier',
				noSslVerifier: true
			}, function(err, res) {
				assert.isNull(err);

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: with bad callback', function() {
		it('should throw and error', function(done) {
			assert.throws(function() {
				client.head('http://127.0.0.1:' + common.options.port + '/');
			}, TypeError, 'Parameter \'callback\' must be a function, not undefined');

			done();
		});
	});

	describe('HEAD: with standard user agent', function() {
		it('should pass the standard user-agent header', function(done) {
			client.head('http://127.0.0.1:' + common.options.port + '/user-agent-reflect', function(err, res) {
				assert.ifError(err);

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['user-agent'], util.format('http-request/v%s (http://git.io/tl_S2w) node.js/%s', config.version, process.version), 'we got the proper user-agent header back into the response');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: with user agent turned off', function() {
		it('should not pass the user-agent header back', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/user-agent-reflect',
				noUserAgent: true
			}, function(err, res) {
				assert.isNull(err);

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.isUndefined(res.headers['user-agent'], 'there is no user agent passed back');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: with timeout', function() {
		it('should timeout', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.noPort + '/',
				timeout: 1
			}, function(err) {
				assert.instanceOf(err, Error, 'the error is an instance of Error');
				assert.strictEqual(err.method, 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: with proxy', function() {
		it('should succeed', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/proxy-request',
				proxy: {
					host: '127.0.0.1',
					port: common.options.proxyPort
				}
			}, function(err, res) {
				assert.isNull(err);

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['x-via'], 'http-proxy', 'we actual got the response from the proxy');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: with not modified', function() {
		it('should return a 304 response', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/not-modified',
				headers: {
					'if-modified-since': new Date(0).toString()
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 304, 'we got the proper HTTP status code');
				assert.isDefined(res.headers, 'we got the response headers');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: to not-modified without if-modified-since', function() {
		it('should return a 200 response', function(done) {
			client.head('http://127.0.0.1:' + common.options.port + '/not-modified', function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.isDefined(res.headers, 'we got the response headers');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: to proxy to use-proxy', function() {
		it('should go through the proxy to the use-proxy actual response', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/use-proxy',
				proxy: {
					host: '127.0.0.1',
					port: common.options.proxyPort
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['x-via'], 'http-proxy', 'we actual got the response from the proxy');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: to use-proxy', function() {
		it('should receive the response via a http-proxy', function(done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/use-proxy',
				maxRedirects: 1
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['x-via'], 'http-proxy', 'we actual got the response from the proxy');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

				done();
			});
		});
	});

	describe('HEAD: to redirect from HTTPS to HTTP', function() {
		it('should redirect without issues', function(done) {
			client.head({
				url: 'https://127.0.0.1:' + common.options.securePort + '/to-http',
				headers: {
					host: 'http-get.lan'
				},
				ca: [require('./ca.js')]
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['x-http-method'], 'HEAD', 'the method is HEAD');

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