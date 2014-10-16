'use strict';

/* core libraries */
var fs = require('fs');
var u = require('url');
var p = require('path');
var zlib = require('zlib');
var http = require('http');
var https = require('https');
var qs = require('querystring');

/* 3rd party libraries */
var assert = require('chai').assert;
var multiparty = require('multiparty');
var mmm = require('mmmagic');
var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

var options = {
	host: '127.0.0.1',
	port: process.env.HTTP_REQUEST_HTTP || 42890,
	securePort: process.env.HTTP_REQUEST_HTTPS || 42891,
	proxyPort: process.env.HTTP_REQUEST_PROXY || 42892,
	noPort: process.env.HTTP_REQUEST_NOPORT || 42893,
	filePort: process.env.HTTP_REQUEST_FILE || 42894
};

exports.options = options;

var secureServerOptions = {
	key: '-----BEGIN RSA PRIVATE KEY-----\n\
MIICXAIBAAKBgQCqU3qR60Pgojh8HjO3+ttmgZVj6l5Ai0PHscCUq7q72vrgJVjz\n\
LqfOz2K182MxACwh5oYklqhSuL+7j+GvXRVCoq7Y2zE6P/PphEGhVwgS1fg034S4\n\
sgzuY01MzbBKfG1j5YOYMpAo0E4TcxF/iT69L3aRGyWP/xc9rG8rsypdTQIDAQAB\n\
AoGAaFjYIIk3fmkjnbaLDM2cmEIPGbU9pOEs1yxoxSwoLGpNhACda+5LVAHtgXbo\n\
b96hKuulhsjdukABBpFxPBQUr0w8oc67aY7ihkD0Hix/ug1oUj7rskumRmNMqrJz\n\
n+uPq0nnFEQqKsR3RavasLyaAR8CpPAQ6eW5EWIHY859GkECQQDVY9ezBjNMpMr+\n\
UeEiPQ/KKhsrAVqdz8YbFe0d+MitDaMjTo9t6JTXq+pWK/s7G1QD6l2NpruR8+Td\n\
uUb+UTm1AkEAzFZG9CGjwxew5WJcNmM+cEOtfrZKvPjbP7d06WFQDmXeW/Hxpz7M\n\
14dNut5FEln0IwsfyEVrckIfpSv3hET0OQJAGtA362PtEEVoyHorauz3TfTqgwXh\n\
iBDymLaxm+GF/dDH3gjiFvJxuYP9pyRRpkSx0ughJ0p7KUTXTlEYrZ4xPQJBAIkT\n\
9AOAsbiGIyCu7Id76n4rmK8hoV/GXmcPLnoF00vlYNczptZ4lbicxzNuOs4F1HbR\n\
1p9mmp8K5unKZgCwtVkCQBTu2Q57Pq6bMm0szuxU/+v5/6ECZyNLkW6fjOaro4TU\n\
0UN0N4vfzkQXx7zwB2b462/hDmMABS3ZaySuWW4bsyo=\n\
-----END RSA PRIVATE KEY-----\n\
\n',
	cert: '-----BEGIN CERTIFICATE-----\n\
MIIDAjCCAmugAwIBAgIJAK2xvkb3AFXoMA0GCSqGSIb3DQEBBQUAMHwxCzAJBgNV\n\
BAYTAlJPMRMwEQYDVQQIEwpTb21lLVN0YXRlMQ0wCwYDVQQKEwRIb21lMQ0wCwYD\n\
VQQLEwRIb21lMRUwEwYDVQQDFAzImHRlZmFuIFJ1c3UxIzAhBgkqhkiG9w0BCQEW\n\
FHNhbHR3YXRlcmNAZ21haWwuY29tMB4XDTEyMTIwODE2NDgyMVoXDTIyMTIwNjE2\n\
NDgyMVowgYwxCzAJBgNVBAYTAlJPMRMwEQYDVQQIEwpTb21lLVN0YXRlMQ4wDAYD\n\
VQQHEwVTaWJpdTENMAsGA1UEChMESG9tZTENMAsGA1UECxMESG9tZTEVMBMGA1UE\n\
AxMMaHR0cC1nZXQubGFuMSMwIQYJKoZIhvcNAQkBFhRzYWx0d2F0ZXJjQGdtYWls\n\
LmNvbTCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAqlN6ketD4KI4fB4zt/rb\n\
ZoGVY+peQItDx7HAlKu6u9r64CVY8y6nzs9itfNjMQAsIeaGJJaoUri/u4/hr10V\n\
QqKu2NsxOj/z6YRBoVcIEtX4NN+EuLIM7mNNTM2wSnxtY+WDmDKQKNBOE3MRf4k+\n\
vS92kRslj/8XPaxvK7MqXU0CAwEAAaN7MHkwCQYDVR0TBAIwADAsBglghkgBhvhC\n\
AQ0EHxYdT3BlblNTTCBHZW5lcmF0ZWQgQ2VydGlmaWNhdGUwHQYDVR0OBBYEFA+j\n\
xGmzi6nVe1sRU5u27nex2I2RMB8GA1UdIwQYMBaAFGFTKPE3pkVvsl4aI204q678\n\
CaXvMA0GCSqGSIb3DQEBBQUAA4GBACAjdDj9knTm1n+zJUPZIQWQEtG8/ZizuwO7\n\
pqovTsKrytNQdXjizJNbXL98vr956fcuCYCwwCX3M60amVhbRYa2XoHegJBZm/KS\n\
Nf1BxNjf/LEgc4yAn6XxRfwG3hqqyvhXeRhs6pehWxgAUje2TIKBfYkgyo1MMeBQ\n\
GzbWB96n\n\
-----END CERTIFICATE-----\n\
\n'
};

/**
 * The HTTP test server response wrapper
 *
 * @param {Object} req The client request
 * @param {Object} res The server response
 */
var Response = function(req, res) {
	this.req = req;
	this.res = res;
};

/**
 * Interprets the Accept-Encoding header, sets the proper response header
 *
 * @returns {Mixed} The encoding sent to the client
 */
Response.prototype.encoding = function(forceEncoding) {
	if (forceEncoding) {
		return forceEncoding;
	}

	if (this.req.headers['accept-encoding']) {
		var accept = this.req.headers['accept-encoding'].split(',');

		if (accept.indexOf('gzip') !== -1) {
			return 'gzip';
		}

		if (accept.indexOf('deflate') !== -1) {
			return 'deflate';
		}
	}

	return null;
};

/**
 * Sends the HTTP response to the client
 *
 * @param {Object} content The HTTP response
 * @param {String} content.body The HTTP response body content
 * @param {String} content.type The content MIME type
 */
Response.prototype.send = function(content, forceEncoding, breakEncoding) {
	if (typeof content !== 'object') {
		content = {};
	}

	if (typeof content.body !== 'string') {
		content.body = 'Hello World';
	}

	if (typeof content.type !== 'string') {
		content.type = 'text/plain';
	}

	if (typeof content.code !== 'number') {
		content.code = 200;
	}

	if (typeof content.headers === 'object') {
		var header;

		for (header in content.headers) {
			if (content.headers.hasOwnProperty(header)) {
				this.res.setHeader(header.toLowerCase(), content.headers[header]);
			}
		}
	}

	if (this.req.headers.range) {
		var range = this.req.headers.range.split('=');
		range = range[1].split('-');

		this.res.setHeader('content-range', range[0] + '-' + range[1] + '/' + content.body.length);

		content.code = 206;
		content.body = content.body.substring(range[0], range[1]);
	}

	var self = this;

	switch (this.encoding(forceEncoding)) {
		case 'gzip':
			zlib.gzip(content.body, function(err, compressed) {
				if (!err) {
					self.res.setHeader('content-encoding', 'gzip');

					if (!breakEncoding) {
						content.body = compressed;
					}

					self.write(content);
				} else {
					self.res.writeHead(500, {
						'content-type': 'text/plain'
					});
				}
				self.res.end();
			});
			break;

		case 'deflate':
			zlib.deflate(content.body, function(err, compressed) {
				if (!err) {
					self.res.setHeader('content-encoding', 'deflate');

					if (!breakEncoding) {
						content.body = compressed;
					}

					self.write(content);
				} else {
					self.res.writeHead(500, {
						'content-type': 'text/plain'
					});
				}
				self.res.end();
			});
			break;

		default:
			self.write(content);
			self.res.end();
			break;
	}
};

/**
 * Sets some headers and sends the content down the pipe for HTTP methods that support this
 *
 * @param {String} content The content object constructed by this.send
 */
Response.prototype.write = function(content) {
	this.res.setHeader('content-length', content.body.length);

	this.res.writeHead(content.code, {
		'content-type': content.type,
		'x-http-method': this.req.method
	});

	if (this.req.method !== 'HEAD') {
		this.res.write(content.body);
	}
};

/**
 * Wrapper for creating a HTTP/HTTPS server
 *
 * @param {Object} module The node.js core module http or https
 * @param {Object} opt The options for the HTTPS server
 * @returns {Object} The HTTP/HTTPS server instance
 */
var createServer = function(module, opt) {
	var callback = function(req, res) {
		var response = new Response(req, res);
		var buf, size;

		switch (req.url) {
			case '/redirect':
				response.send({
					code: 301,
					type: 'text/plain',
					body: 'Go Home!',
					headers: {
						location: '/redirect-target'
					}
				});
				break;

			case '/redirect-loop':
				response.send({
					code: 301,
					headers: {
						location: '/redirect-loop'
					},
					body: 'It\'s spinnin'
				});
				break;

			case '/redirect-without-location':
				response.send({
					code: 301,
					type: 'text/plain',
					body: 'Redirect without location'
				});
				break;

			case '/to-http':
				response.send({
					code: 301,
					type: 'text/plain',
					headers: {
						location: 'http://127.0.0.1:' + options.port + '/http',
					},
					body: 'Redirect to HTTP'
				});
				break;

			case '/basic-auth':
				// basic HTTP Basic Auth parser
				var authorization = req.headers.authorization || '';
				var token = authorization.split(/\s+/).pop() || '';
				var auth = new Buffer(token, 'base64').toString();
				auth = auth.split(/:/);

				var body = JSON.stringify({
					username: auth[0],
					password: auth[1]
				});

				response.send({
					type: 'application/json',
					body: body
				});
				break;

			case '/header-reflect':
				if (req.headers.foo) {
					res.setHeader('foo', req.headers.foo);
				}

				response.send();
				break;

			case '/not-found':
				response.send({
					code: 404,
					body: 'Not Found'
				});
				break;

			case '/big-error':
				response.send({
					code: 404,
					body: new Buffer(1048577).toString()
				});
				break;

			case '/force-gzip':
				response.send({
					code: 200,
					body: 'Hello World'
				}, 'gzip');
				break;

			case '/path-reflect':
				response.send({
					code: 200,
					body: 'Hello World',
					headers: {
						path: req.url
					}
				});
				break;

			case '/user-agent-reflect':
				var headers = {};
				if (req.headers['user-agent']) {
					headers['user-agent'] = req.headers['user-agent'];
				}

				response.send({
					headers: headers
				});
				break;

			case '/save-to-file':
				response.send({
					headers: {
						'last-modified': new Date(0)
					}
				});
				break;

			case '/no-content':
				response.send({
					code: 204,
					body: null
				});
				break;

			case '/not-modified':
				if (req.headers['if-modified-since'] === new Date(0).toString()) {
					response.send({
						code: 304,
						headers: {
							'last-modified': new Date(0)
						}
					});
				} else {
					response.send();
				}
				break;

			case '/use-proxy':
				if (req.headers['x-via'] === 'http-proxy') {
					response.send();
				} else {
					response.send({
						code: 305,
						headers: {
							location: 'http://127.0.0.1:' + options.proxyPort
						},
						body: 'use-proxy'
					});
				}
				break;

			case '/break-compression':
				if (req.headers['accept-encoding']) {
					response.send({
						body: 'broken-gzip'
					}, 'gzip', true);
				} else {
					response.send({
						headers: {
							'last-modified': new Date(0)
						}
					});
				}
				break;

			case '/post':
				if (req.method === 'POST') {
					headers = {
						'x-content-type': req.headers['content-type'],
						'x-content-length': req.headers['content-length']
					};

					if (req.headers.wibble) {
						headers.wibble = req.headers.wibble;
					}

					if (req.headers['content-type'].search('multipart/form-data') === -1) {
						buf = [];
						size = 0;

						req.on('data', function(chunk) {
							buf.push(chunk);
							size += chunk.length;
						});

						req.on('end', function() {
							response.send({
								headers: headers,
								body: Buffer.concat(buf, size).toString()
							});
						});
					} else {
						var form = new multiparty.Form();

						form.parse(req, function(err, fields) {
							assert.ifError(err);
							response.send({
								body: qs.stringify(fields),
								headers: headers
							});
						});
					}
				} else {
					response.send({
						code: 405,
						body: '<html><head><title>405 - Method not supported</title></head><body><h1>Method not supported.</h1></body></html>'
					});
				}
				break;

			case '/put':
				if (req.method === 'PUT') {
					headers = {
						'x-content-type': req.headers['content-type'],
						'x-content-length': req.headers['content-length']
					};

					buf = [];
					size = 0;

					req.on('data', function(chunk) {
						buf.push(chunk);
						size += chunk.length;
					});

					req.on('end', function() {
						response.send({
							headers: headers,
							body: Buffer.concat(buf, size).toString()
						});
					});
				} else {
					response.send({
						code: 405,
						body: '<html><head><title>405 - Method not supported</title></head><body><h1>Method not supported.</h1></body></html>'
					});
				}
				break;

			default:
				response.send();
				break;
		}
	};

	if (opt) {
		return module.createServer(opt, callback);
	}

	return module.createServer(callback);
};

/**
 * Creates a simple HTTP proxy server
 *
 * @returns {Object} The HTTP proxy server
 */
exports.createProxy = function() {
	return http.createServer(function(req, res) {
		var path = u.parse(req.url);
		req.headers['x-via'] = 'http-proxy';
		var request = http.request({
			host: path.hostname,
			port: path.port,
			headers: req.headers,
			method: req.method,
			path: path.pathname || '/' + path.search || ''
		}, function(response) {
			response.headers['x-via'] = 'http-proxy';
			res.writeHead(response.statusCode, response.headers);
			response.pipe(res);
		});

		req.pipe(request);

		request.on('error', function(err) {
			res.writeHead(500);
			res.write(JSON.stringify(err));
			res.end();
		});
	});
};

/**
 * Creates the HTTP, HTTPS, and proxy servers for testing the client
 *
 * @param {Function} callback The completion callback provided by mocha
 */
exports.createServers = function(callback) {
	var servers = 0;
	var instances = {};

	var createdServers = function() {
		if (servers === 3) {
			callback();
		}
	};

	instances.server = createServer(http);
	instances.server.listen(options.port, function() {
		servers++;
		createdServers();
	});

	instances.secureServer = createServer(https, secureServerOptions);
	instances.secureServer.listen(options.securePort, function() {
		servers++;
		createdServers();
	});

	instances.proxy = exports.createProxy();
	instances.proxy.listen(options.proxyPort, function() {
		servers++;
		createdServers();
	});

	return instances;
};

/**
 * Creates a file server for testing mimeSniff
 *
 * @param {Function} callback The completion callback provided by mocha
 */
exports.createFileServer = function(callback) {
	return http.createServer(function(req, res) {
		var uri = u.parse(req.url).pathname;
		var filename = p.join(process.cwd() + '/test/data', uri);
		fs.stat(filename, function(err, stats) {
			if (err) {
				res.writeHead(404, {
					'content-type': 'text/plain'
				});
				res.end('404 - Not found');
				return;
			}

			magic.detectFile(filename, function(err, mime) {
				if (err) {
					res.writeHead(500, {
						'content-type': 'text/plain'
					});
					res.end('500 - Internal Server Error');
					return;
				}

				res.writeHead(200, {
					'content-type': mime,
					'content-length': stats.size
				});
				var fileStream = fs.createReadStream(filename);
				fileStream.pipe(res);
			});
		});
	}).listen(options.filePort, function() {
		callback();
	});
};