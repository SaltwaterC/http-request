'use strict';

/*global describe: true, it: true, before: true, after: true*/

var client = require('../');
var config = require('../package.json');

var common = require('./common.js');

var u = require('url');
var fs = require('fs');
var util = require('util');
var domain = require('domain');

var assert = require('chai').assert;

describe('HTTP GET method tests', function() {
	var server, secureServer, proxy;

	before(function(done) {
		var servers = common.createServers(done);
		server = servers.server;
		secureServer = servers.secureServer;
		proxy = servers.proxy;
	});

	describe('GET: Hello World Buffer - plain', function() {
		it('should pass "Hello World" buffer', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/hello-plain',
				noCompress: true,
				noRedirect: true
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'the status is success');
				assert.isObject(res.headers, 'there is a headers object');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.isUndefined(res.headers['content-encoding'], 'the content must not be encoded');
				assert.instanceOf(res.buffer, Buffer, 'the buffer is an instance of Buffer');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');

				done();
			});
		});
	});

	describe('GET: Hello World Buffer - gzip', function() {
		it('should pass "Hello World" buffer', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/hello-gzip',
				headers: {
					'accept-encoding': 'gzip'
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.headers['content-encoding'], 'gzip', 'the content is encoded with gzip');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');

				done();
			});
		});
	});

	describe('GET: Hello World Buffer - deflate', function() {
		it('should pass "Hello World" buffer', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/hello-deflate',
				headers: {
					'accept-encoding': 'deflate'
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.headers['content-encoding'], 'deflate', 'the content is encoded with deflate');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');

				done();
			});
		});
	});

	describe('GET: Basic Authentication', function() {
		it('should pass back the basic authentication', function(done) {
			var url = u.format({
				protocol: 'http:',
				hostname: '127.0.0.1',
				port: common.options.port,
				pathname: '/basic-auth',
				auth: 'user@example.com:pass word'
			});

			client.get(url, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				var auth = JSON.parse(res.buffer.toString());
				var urlAuth = u.parse(url).auth.split(/:/);

				assert.strictEqual(auth.username, urlAuth[0]);
				assert.strictEqual(auth.password, urlAuth[1]);

				done();
			});
		});
	});

	describe('GET: Basic Authentication with auth option', function() {
		it('should pass back the basic authentication', function(done) {
			var basicAuth = {
				type: 'basic',
				username: 'user@example.com',
				password: 'pass#word'
			};

			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/basic-auth',
				auth: basicAuth
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				var auth = JSON.parse(res.buffer.toString());

				assert.strictEqual(auth.username, basicAuth.username);
				assert.strictEqual(auth.password, basicAuth.password);

				done();
			});
		});
	});

	describe('GET: invalid type for the auth option', function() {
		it('should throw a TypeError', function(done) {
			assert.throws(function() {
				client.get({
					url: 'http://127.0.0.1:' + common.options.port + '/basic-auth',
					auth: 'foo'
				}, function(err) {
					assert.ifError(err);
				});
			}, TypeError, 'Parameter \'options.auth\' must be an object, not string');

			done();
		});
	});

	describe('GET: invalid option.auth.type', function() {
		it('should throw an Error', function(done) {
			assert.throws(function() {
				client.get({
					url: 'http://127.0.0.1:' + common.options.port + '/basic-auth',
					auth: {
						type: 'foo'
					}
				}, function(err) {
					assert.ifError(err);
				});
			}, Error, 'Invalid value for option.auth.type.');

			done();
		});
	});

	describe('GET: broken DNS name over HTTP', function() {
		it('should fail with an error passed back to the completion callback', function(done) {
			client.get('http://.foo.bar/', function(err, res) {
				assert.instanceOf(err, Error, 'the error is an Error instance');
				assert.strictEqual(err.url, 'http://.foo.bar/');

				assert.isUndefined(res, 'we have a response');

				done();
			});
		});
	});

	describe('GET: broken DNS name over HTTPS', function() {
		it('should fail with an error passed back to the completion callback', function(done) {
			client.get('https://.foo.bar/', function(err, res) {
				assert.instanceOf(err, Error, 'the error is an Error instance');
				assert.strictEqual(err.url, 'https://.foo.bar/');

				assert.isUndefined(res, 'we have a response');

				done();
			});
		});
	});

	describe('GET: DNS error', function() {
		it('should fail with an error passed back to the completion callback', function(done) {
			client.get('http://wibble.wobble/', function(err, res) {
				assert.instanceOf(err, Error, 'the error is an Error instance');
				assert.strictEqual(err.code, 'ENOTFOUND');
				assert.strictEqual(err.url, 'http://wibble.wobble/');

				assert.isUndefined(res, 'we have a response');

				done();
			});
		});
	});

	describe('GET: header reflect', function() {
		it('should pass back the header foo sent from the client', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/header-reflect',
				headers: {
					foo: 'bar'
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.headers.foo, 'bar', 'we got the foo header back');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got the proper response body');

				done();
			});
		});
	});

	describe('GET: with invalid maxBody', function() {
		it('should throw a TypeError', function(done) {
			assert.throws(function() {
				client.get({
					url: 'http://127.0.0.1:' + common.options.port + '/',
					maxBody: 'foo'
				}, function(err) {
					assert.ifError(err);
				});
			}, TypeError, 'Parameter \'options.maxBody\' must be a number, not string');

			done();
		});
	});

	describe('GET: with invalid progress', function() {
		it('should throw a TypeError', function(done) {
			assert.throws(function() {
				client.get({
					url: 'http://127.0.0.1:' + common.options.port + '/',
					progress: 'foo'
				}, function(err) {
					assert.ifError(err);
				});
			}, TypeError, 'Parameter \'options.progress\' must be a function, not string');

			done();
		});
	});

	describe('GET: without protocol prefix', function() {
		it('should work fine by prepending http:// to the URL', function(done) {
			client.get('127.0.0.1:' + common.options.port + '/no-protocol-prefix', function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'the HTTP status code is OK');
				assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got the proper buffer');

				done();
			});
		});
	});

	describe('GET: ranged content', function() {
		it('should return just part of the content', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/range-request',
				headers: {
					range: 'bytes=0-5'
				},
				noCompress: true
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 206, 'we have the proper status code');
				assert.isDefined(res.headers['content-length'], 'we have a Content-Lenght');
				assert.strictEqual(res.headers['content-range'], '0-5/11', 'we have the proper value for the Content-Range response header');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				assert.strictEqual(res.buffer.toString(), 'Hello', 'we have the proper partial content');

				done();
			});
		});
	});

	describe('GET: with redirect', function() {
		it('should redirect succesfully', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/redirect',
				headers: {
					host: 'foo.bar'
				},
				noCompress: true
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.url, 'http://127.0.0.1:' + common.options.port + '/redirect-target', 'we got the proper URL back');
				assert.isUndefined(res.headers.host, 'the host header is deleted in case of a redirect');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				done();
			});
		});
	});

	describe('GET: with progress callback', function() {
		it('should call the progress callback', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/progress',
				progress: function(current, total) {
					// there's a single data event
					// the Hello World is compressed with gzip
					// but larger than the payload

					assert.strictEqual(current, 31);
					assert.strictEqual(total, 31);
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got back the proper buffer');

				done();
			});
		});
	});

	describe('GET: over HTTPS with SSL validation', function() {
		it('should verify succesfully the connection', function(done) {
			client.get({
				url: 'https://127.0.0.1:' + common.options.securePort + '/ssl-validation',
				headers: {
					host: 'http-get.lan'
				},
				ca: [require('./ca.js')]
			}, function(err, res) {
				assert.isNull(err);

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got back the proper buffer');

				done();
			});
		});
	});

	describe('GET: without url', function() {
		it('should throw an error', function(done) {
			assert.throws(function() {
				client.get({}, function(err) {
					assert.ifError(err);
				});
			}, TypeError, 'Parameter \'options.url\' must be a string, not undefined');

			done();
		});
	});

	describe('GET: 404 response', function() {
		it('should buffer the error document', function(done) {
			var url = 'http://127.0.0.1:' + common.options.port + '/not-found';
			client.get(url, function(err, res) {
				assert.instanceOf(err, Error, 'the error is an instance of Error');
				assert.strictEqual(err.document.toString(), 'Not Found', 'we got back the proper error document');
				assert.strictEqual(err.largeDocument, false, 'no error document overflow');
				assert.strictEqual(err.url, url, 'the error object has the proper URL');
				assert.strictEqual(err.headers['content-encoding'], 'gzip');
				assert.strictEqual(err.headers['x-http-method'], 'GET', 'the method is GET');

				assert.isUndefined(res, 'we have a response');

				done();
			});
		});
	});

	describe('GET: with redirect loop', function() {
		it('should detect the condition and pass the error argument to the completion callback', function(done) {
			var url = 'http://127.0.0.1:' + common.options.port + '/redirect-loop';

			client.get(url, function(err, res) {
				assert.instanceOf(err, Error, 'the error is an instance of Error');
				assert.strictEqual(err.message, 'Redirect loop detected after 12 requests.', 'the proper message is passed back to the user');
				assert.strictEqual(err.code, 301, 'the error code is equal to the code of the HTTP response');
				assert.strictEqual(err.url, url, 'the error object has the proper URL');
				assert.strictEqual(err.headers['x-http-method'], 'GET', 'the method is GET');

				assert.isUndefined(res, 'we have a response');

				done();
			});
		});
	});

	describe('GET: with maxBody limit', function() {
		it('should detect that the buffer is overflowing the user limit', function(done) {
			var url = 'http://127.0.0.1:' + common.options.port + '/max-body';
			client.get({
				url: url,
				maxBody: 2
			}, function(err, res) {
				assert.instanceOf(err, Error, 'the error is an instance of Error');
				assert.strictEqual(err.message, 'Large body detected.', 'the proper message is passed back to the client');
				assert.strictEqual(err.code, 200, 'the error code is equal to the code of the HTTP response');
				assert.strictEqual(err.url, url, 'the error object has the proper URL');
				assert.strictEqual(err.headers['x-http-method'], 'GET', 'the method is GET');

				assert.isUndefined(res, 'we have a response');

				done();
			});
		});
	});

	describe('GET: with null argument for the file argument', function() {
		it('should simulate writing the file /dev/null in a cross platform way', function(done) {
			client.get('http://127.0.0.1:' + common.options.port + '/redirect', null, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'the status is success');
				assert.isObject(res.headers, 'there is a headers object');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				// regression test for the fix from v0.4.2
				assert.isUndefined(res.buffer, 'there is no buffered data');

				done();
			});
		});
	});

	describe('GET: with gzipped response without being requested', function() {
		it('should return gzipped content without being requested', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/force-gzip',
				noCompress: true
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'the HTTP status code is OK');
				assert.strictEqual(res.headers['content-encoding'], 'gzip', 'we got back gzip even though it was not requested');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got back the proper buffer');

				done();
			});
		});
	});

	describe('GET: response saved to file', function() {
		it('should save the response body to a file', function(done) {
			client.get('http://127.0.0.1:' + common.options.port + '/save-to-file', 'hello.txt', function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200);
				assert.strictEqual(res.headers['content-type'], 'text/plain');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				fs.stat(res.file, function(err, stats) {
					assert.isNull(err, 'we have an error');
					assert.strictEqual(new Date(stats.mtime).getTime(), new Date(0).getTime(), 'we got back the proper timestamp');

					fs.readFile(res.file, function(err, data) {
						assert.isNull(err, 'we have an error');

						assert.strictEqual(data.toString(), 'Hello World');

						fs.unlink(res.file, function(err) {
							assert.isNull(err);

							done();
						});
					});
				});
			});
		});
	});

	describe('GET: stream passed to client', function() {
		it('should pass back a readable stream to the client', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/pass-stream',
				stream: true,
				noCompress: true
			}, function(err, res) {
				var count = 0;

				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
				assert.strictEqual(res.headers['content-length'], '11', 'we got the proper size for the data');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				res.stream.on('data', function(data) {
					count += data.length;
				});

				res.stream.on('end', function() {
					assert.strictEqual(count, 11, 'we have the proper size for the stream');

					done();
				});

				res.stream.on('error', function(err) {
					assert.isNull(err, 'we have an error');
				});

				res.response.resume();
			});
		});
	});

	describe('GET: with gzip compressed stream passed to client', function() {
		it('should pass back a decompressed readable stream to the client', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/pass-decompressed-stream',
				stream: true
			}, function(err, res) {
				var count = 0;

				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
				assert.strictEqual(res.headers['content-length'], '31', 'we got the proper size for the compressed data');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				res.stream.on('data', function(data) {
					count += data.length;
				});

				res.stream.on('end', function() {
					assert.strictEqual(count, 11, 'we have the proper size for the decompressed stream');

					done();
				});

				res.stream.on('error', function(err) {
					assert.isNull(err, 'we have an error');
				});

				res.response.resume();
			});
		});
	});

	describe('GET: with error passed to the completion callback by the fs module', function() {
		it('should pass back an error from the fs module', function(done) {
			var path = 'world.txt';

			fs.open(path, 'w+', function(err, fd) {
				assert.isNull(err, 'we have an error');

				fs.close(fd, function(err) {
					assert.isNull(err, 'we have an error');

					fs.chmod(path, '0100', function(err) {
						assert.isNull(err, 'we have an error');

						var url = 'http://127.0.0.1:' + common.options.port + '/save-to-invalid-file';
						client.get(url, path, function(err, res) {
							assert.instanceOf(err, Error, 'the error is an instance of Error');
							assert.strictEqual(err.code, 'EACCES', 'we have the proper error code');
							assert.strictEqual(err.url, url);
							assert.strictEqual(err.headers['x-http-method'], 'GET', 'the method is GET');

							assert.isUndefined(res, 'we have a response');

							fs.unlink(path, function(err) {
								assert.isNull(err);

								done();
							});
						});
					});
				});
			});
		});
	});

	// On Travis CI this response comes back short at 1043957 bytes
	// Therefore, this test always fails under Travis CI
	if (!process.env.TRAVIS_NODE_VERSION) {
		describe('GET: with overflowing error document', function() {
			it('should detect the situation and act accordingly', function(done) {
				client.get({
					url: 'http://127.0.0.1:' + common.options.port + '/big-error',
					noCompress: true
				}, function(err) {
					assert.instanceOf(err, Error, 'the error is an instance of Error');

					assert.strictEqual(err.code, 404, 'we got back the proper status code');
					assert.strictEqual(err.largeDocument, true, 'we detect the overflowing error document');
					assert.strictEqual(err.noDocument, false, 'we detect that there was a document, but could not be buffered');
					assert.strictEqual(err.headers['content-length'], '1048577', 'we got the content length of the overflowing error document');
					assert.strictEqual(err.url, 'http://127.0.0.1:' + common.options.port + '/big-error', 'we got back the proper error URL');
					assert.strictEqual(err.headers['x-http-method'], 'GET', 'the method is GET');

					done();
				});
			});
		});
	}

	describe('GET: with bad callback', function() {
		it('should throw and error', function(done) {
			assert.throws(function() {
				client.get('http://127.0.0.1:' + common.options.port + '/');
			}, TypeError, 'Parameter \'callback\' must be a function, not undefined');

			done();
		});
	});

	describe('GET: with standard user agent', function() {
		it('should pass the standard user-agent header', function(done) {
			client.get('http://127.0.0.1:' + common.options.port + '/user-agent-reflect', function(err, res) {
				assert.ifError(err);

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['user-agent'], util.format('http-request/v%s (http://git.io/tl_S2w) node.js/%s', config.version, process.version), 'we got the proper user-agent header back into the response');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				done();
			});
		});
	});

	describe('GET: with user agent turned off', function() {
		it('should not pass the user-agent header back', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/user-agent-reflect',
				noUserAgent: true
			}, function(err, res) {
				assert.ifError(err);

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.isUndefined(res.headers['user-agent'], 'there is no user agent passed back');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				done();
			});
		});
	});

	describe('GET: with noRedirect', function() {
		it('should read the status code, headers, and body from the redirect response', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/redirect',
				noCompress: true,
				noRedirect: true
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 301, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Go Home!', 'we got the proper HTTP response body');

				done();
			});
		});
	});

	describe('GET: with proxy', function() {
		it('should succeed', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/proxy-request',
				proxy: {
					host: '127.0.0.1',
					port: common.options.proxyPort
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got the proper response body');
				assert.strictEqual(res.headers['x-via'], 'http-proxy', 'we actual got the response from the proxy');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				done();
			});
		});
	});

	describe('GET: with no content', function() {
		it('should return a 204 response', function(done) {
			client.get('http://127.0.0.1:' + common.options.port + '/no-content', function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 204, 'we got the proper HTTP status code');
				assert.isDefined(res.headers, 'we got the response headers');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.isUndefined(res.buffer, 'we did not get back a response body');

				done();
			});
		});
	});

	describe('GET: with not modified', function() {
		it('should return a 304 response', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/not-modified',
				headers: {
					'if-modified-since': new Date(0).toString()
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 304, 'we got the proper HTTP status code');
				assert.isDefined(res.headers, 'we got the response headers');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.isUndefined(res.buffer, 'we did not get back a response body');

				done();
			});
		});
	});

	describe('GET: to not-modified without if-modified-since', function() {
		it('should return a 200 response', function(done) {
			client.get('http://127.0.0.1:' + common.options.port + '/not-modified', function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.isDefined(res.headers, 'we got the response headers');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got the default response body');

				done();
			});
		});
	});

	describe('GET: to proxy to use-proxy', function() {
		it('should go through the proxy to the use-proxy actual response', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/use-proxy',
				proxy: {
					host: '127.0.0.1',
					port: common.options.proxyPort
				}
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['x-via'], 'http-proxy', 'we actual got the response from the proxy');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got the default response body');

				done();
			});
		});
	});

	describe('GET: to use-proxy', function() {
		it('should receive the response via a http-proxy', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/use-proxy',
				maxRedirects: 1
			}, function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['x-via'], 'http-proxy', 'we actual got the response from the proxy');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got the default response body');

				done();
			});
		});
	});

	describe('GET: with broken gzip encoding', function() {
		it('should reissue the request without the accept-encoding: gzip,deflate header', function(done) {
			client.get('http://127.0.0.1:' + common.options.port + '/break-compression', function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got the default response body');

				done();
			});
		});
	});

	describe('GET: with broken encoding saved to file', function() {
		it('should reissue the request without the accept-encoding: gzip,deflate header', function(done) {
			client.get('http://127.0.0.1:' + common.options.port + '/break-compression', 'foo.txt', function(err, res) {
				assert.isNull(err, 'we have an error');

				assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');

				fs.stat(res.file, function(err, stats) {
					assert.isNull(err, 'we have an error');
					assert.strictEqual(new Date(stats.mtime).getTime(), new Date(0).getTime(), 'we got back the proper timestamp');

					fs.readFile(res.file, function(err, data) {
						assert.isNull(err, 'we have an error');

						assert.strictEqual(data.toString(), 'Hello World');

						fs.unlink(res.file, function(err) {
							assert.isNull(err);

							done();
						});
					});
				});
			});
		});
	});

	// Catching TypeError in node.js v0.8.x is dodgy
	if (process.version.substring(0, 5) !== 'v0.8.') {
		describe('GET: with invalid type for file', function() {
			it('should throw a TypeError', function(done) {
				var dom = domain.create();
	
				dom.on('error', function(err) {
					assert.instanceOf(err, TypeError, 'we got a TypeError');
					assert.strictEqual(err.message, 'Parameter \'file\' must be a string, not number', 'we got the proper message');
	
					done();
				});
	
				dom.run(function() {
					client.get('http://127.0.0.1:' + common.options.port + '/save-to-file', 0, function() {});
				});
			});
		});
	}

	describe('GET: with redirect and defined host header into the request', function() {
		it('should keep the host header for relative redirects', function(done) {
			client.get({
				url: 'http://127.0.0.1:' + common.options.port + '/redirect',
				headers: {
					host: 'foo.bar'
				},
				noRedirect: true
			}, function(err, res) {
				assert.ifError(err, 'we have an error');

				assert.strictEqual(res.code, 301, 'we got the proper HTTP status code');
				assert.strictEqual(res.headers['x-http-method'], 'GET', 'the method is GET');
				assert.strictEqual(res.headers['redirect-to-host'], 'foo.bar');
				assert.strictEqual(res.headers['redirect-to-url'], 'http://127.0.0.1:' + common.options.port + '/redirect-target');

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
