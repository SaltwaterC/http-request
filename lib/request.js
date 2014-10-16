'use strict';

/**
 * @module request
 */

/* local modules */
var tools = require('./tools.js');
var config = require('../package.json');

/* core modules */
var u = require('url');
var fs = require('fs');
var zlib = require('zlib');
var util = require('util');
var http = require('http');
var https = require('https');
var Stream = require('stream').Stream;

/**
 * The HTTP request wrapper
 *
 * @constructor
 *
 * @param {module:request~options} options An Object for defining the HTTP client behavior
 *
 * @throws {TypeError} Parameter 'options' must be an object, not $actualType
 * @throws {TypeError} Parameter 'options.url' must be a string, not $actualType
 * @throws {TypeError} Parameter 'options.method' must be a string, not $actualType
 * @throws {TypeError} Parameter 'options.maxBody' must be a number, not $actualType
 * @throws {TypeError} Parameter 'options.progress' must be a function, not $actualType
 * @throws {TypeError} Parameter 'options.auth' must be an object, not $actualType
 * @throws {Error} Invalid value for option.auth.type.
 */
function Request(options) {
	tools.checkType('options', options, 'object');
	tools.checkType('options.url', options.url, 'string');
	tools.checkType('options.method', options.method, 'string');

	options.method = options.method.toUpperCase();

	this.options = options;

	this.options.url = String(this.options.url).trim();
	if (!this.options.url.match(/^https?:\/\//i)) {
		// assuming HTTP for URLs' like www.example.com/foo.bar
		this.options.url = 'http://' + this.options.url;
	}

	if (!this.options.headers) {
		this.options.headers = {};
	}
	this.normalizeHeaders();

	if (this.options.maxRedirects) {
		this.options.maxRedirects = tools.absInt(this.options.maxRedirects);
	}

	// if you think this is stupid instead of using "else"
	// absInt may return 0 on junk input
	if (!this.options.maxRedirects) {
		this.options.maxRedirects = 10;
	}

	if (this.options.timeout) {
		this.options.timeout = tools.absInt(this.options.timeout);
	}

	if (!this.options.timeout) {
		// if the socket is idle more than a minute, something is really wrong
		this.options.timeout = 60000;
	}

	if (!this.options.headers['user-agent'] && !this.options.noUserAgent) {
		this.options.headers['user-agent'] = util.format('http-request/v%s (http://git.io/tl_S2w) node.js/%s', config.version, process.version);
	}

	if (this.options.maxBody) {
		tools.checkType('options.maxBody', this.options.maxBody, 'number');
		this.options.maxBody = tools.absInt(this.options.maxBody);
	}

	if (this.options.progress) {
		tools.checkType('options.progress', this.options.progress, 'function');
	}

	if (this.options.auth) {
		tools.checkType('options.auth', this.options.auth, 'object');

		switch (this.options.auth.type) {
			case 'basic':
				this.options.headers.authorization = 'Basic ' + new Buffer(this.options.auth.username + ':' + this.options.auth.password).toString('base64');
				break;

			default:
				throw new Error('Invalid value for option.auth.type.');
		}
	}

	// this is needed for making sure there aren't any race conditions
	// due to unexpected node.js behavior
	this.states = {
		error: false, // an error that bubbles up to the user completion callback
		success: false, // successful exit point for the Request.send inner wrapper
		finish: false // succesful exit point for the Request.saveBuffer and Request.saveFile outer wrappers
	};
}

/**
 * Buffers the HTTP response body
 *
 * @param {module:request~innerCallback} callback Completion callback
 */
Request.prototype.saveBuffer = function(callback) {
	if (this.noResponseBody) {
		this.finish(callback);
		return;
	}

	var self = this;
	var buf = [];
	var size = 0;

	this.stream.on('data', function(data) {
		var err;

		buf.push(data);
		size += data.length;

		if (size > 1073741823) {
			err = new Error('Buffer too large. node.js limits the SlowBuffer implementation to 1073741823 bytes.');
		}

		if (self.options.maxBody) {
			if (size > self.options.maxBody) {
				err = new Error('Large body detected.');
			}
		}

		if (err) {
			self.error(err, callback);
		}
	});

	this.stream.on('end', function() {
		self.buffer = Buffer.concat(buf, size);
		self.finish(callback);
	});

	this.stream.on('error', function(err) {
		if (self.response.headers['content-encoding']) {
			self.request.abort();

			self.setNoCompress();
			self = new Request(self.options);

			self.send(function(err) {
				if (err) {
					self.error(err, callback);
					return;
				}

				self.saveBuffer(callback);
			});

			return;
		}

		self.error(err, callback);
	});

	this.response.resume();
};

/**
 * Saves to file the HTTP response body
 *
 * @param {String} file The file path where the HTTP response body is saved
 * @param {module:request~innerCallback} callback Completion callback
 */
Request.prototype.saveFile = function(file, callback) {
	if (this.noResponseBody) {
		this.finish(callback);
		return;
	}

	var self = this;
	var ws = fs.createWriteStream(file);

	ws.on('error', function(err) {
		self.error(err, callback);
	});

	ws.on('close', function() {
		self.file = file;
		if (self.response.headers['last-modified']) {
			self.saveMtime(callback);
		} else {
			self.finish(callback);
		}
	});

	this.stream.on('error', function(err) {
		if (self.response.headers['content-encoding']) {
			self.request.abort();

			self.setNoCompress();
			self = new Request(self.options);

			self.send(function(err) {
				if (err) {
					self.error(err, callback);
					return;
				}

				self.saveFile(file, callback);
			});

			return;
		}
		self.error(err, callback);
	});

	this.stream.pipe(ws);
	this.response.resume();
};

/**
 * Issues the outgoing HTTP request
 *
 * @param {module:request~sendCallback} callback Completion callback
 *
 * @throws {TypeError} Parameter 'callback' must be a function, not $actualType
 */
Request.prototype.send = function(callback) {
	this.reqOpt = {};

	if (!this.options.reqId) {
		this.options.reqId = 0;
	}
	this.options.reqId++;

	if (this.options.reqId > this.options.maxRedirects + 1) {
		this.error(tools.formattedError('Redirect loop detected after %d requests.', this.options.reqId), callback);
		return;
	}

	tools.checkType('callback', callback, 'function');

	if (!this.options.proxy) {
		this.parseUrl();
	} else {
		this.useProxy();
	}

	if (!this.options.noCompress) {
		if (!this.options.headers['accept-encoding']) {
			this.options.headers['accept-encoding'] = 'gzip,deflate';
		}
	} else if (this.options.headers['accept-encoding']) {
		delete(this.options.headers['accept-encoding']);
	}

	if (this.options.reqBody instanceof Buffer) {
		this.options.headers['content-length'] = this.options.reqBody.length;
	}

	this.reqOpt.headers = this.options.headers;
	this.reqOpt.method = this.options.method;

	var self = this;
	var request = this.client.request(this.reqOpt, function(response) {
		self.response = response;
		self.response.pause();

		var err, size;
		var stream = response;

		if (self.options.noCompress && response.headers['content-encoding'] && self.options.debug) {
			console.error('Warning: the server sent %s content without being requested for %s.', response['content-encoding'], self.options.url);
		}

		if (response.headers['content-encoding'] === 'gzip' || response.headers['content-encoding'] === 'deflate') {
			var unzip = zlib.createUnzip();
			stream = response.pipe(unzip);
		}

		self.stream = stream;

		var ret = {
			response: response,
			stream: stream
		};

		switch (response.statusCode) {
			// success
			case 200:
				// OK
			case 201:
				// Created
			case 202:
				// Accepted
			case 203:
				// Non-Authoritative Information
			case 206:
				// Partial Content
				if (self.options.progress) {
					size = 0;

					response.on('data', function(data) {
						size += data.length;
						var total = tools.absInt(self.response.headers['content-length']);

						self.options.progress(size, total);
					});
				}

				if (self.options.reqId > 1) {
					ret.url = self.options.url;
				}

				self.url = ret.url;
				self.success(ret, callback);
				break;

				// redirect requests, handled if they have a valid Location header
			case 301:
				// Moved Permanently
			case 302:
				// Found
			case 303:
				// See Other
			case 307:
				// Temporary Redirect
				if (self.options.noRedirect) {
					self.success(ret, callback);
				} else {
					if (!self.response.headers.location) {
						self.error(new Error('Redirect response without the Location header.'), callback);
					} else {
						self.prepareRedirectUrl();
						self.parseUrl();
						self.send(callback);
						self.response.resume();
						return;
					}
				}
				break;

			case 305:
				// Use Proxy
				if (!self.response.headers.location) {
					self.error(new Error('Use proxy response without the Location header.'), callback);
				} else {
					delete(self.options.parsedUrl);
					self.prepareProxy();
					self.send(callback);
					self.response.resume();
					return;
				}
				break;

				// sucessful requests without response body
			case 204:
				// No Content
			case 205:
				// Reset Content
			case 304:
				// Not Modified
				self.noResponseBody = true;
				self.success(ret, callback);
				break;

				// errors with useful response body
			case 300:
				// Multiple Choices
			case 400:
				// Bad Request
			case 401:
				// Unauthorized
			case 402:
				// Payment Required
			case 403:
				// Forbidden
			case 404:
				// Not Found
			case 405:
				// Method Not Allowed
			case 406:
				// Not Acceptable
			case 407:
				// Proxy Authentication Required
			case 408:
				// Request Timeout
			case 409:
				// Conflict
			case 410:
				// Gone
			case 411:
				// Length Required
			case 412:
				// Precondition Failed
			case 413:
				// Request Entity Too Large
			case 414:
				//Request-URI Too Long
			case 415:
				// Unsupported Media Type
			case 416:
				// Requested Range Not Satisfiable
			case 417:
				// Expectation Failed
				err = tools.formattedError('HTTP Error: %d', response.statusCode);

				err.document = new Buffer(0);
				err.largeDocument = false;
				err.noDocument = false;

				var buf = [];
				size = 0;

				stream.on('data', function(data) {
					buf.push(data);
					size += data.length;

					if (size > 1048576) {
						err.largeDocument = true;
						self.error(err, callback);
					}
				});

				stream.on('end', function() {
					err.document = Buffer.concat(buf, size);
					self.error(err, callback);
				});

				stream.on('error', function(zErr) {
					err.noDocument = true;
					err.message = zErr.message;
					self.error(err, callback);
				});

				self.response.resume();
				break;

				// catch all error handler
			default:
				self.error(tools.formattedError('HTTP Error: %d', response.statusCode), callback);
				self.response.resume();
				break;
		}
	});

	this.request = request;

	this.request.setTimeout(this.options.timeout, function() {
		var err = tools.formattedError('Timeout of %d miliseconds reached for %s %s.', self.options.timeout, self.options.method, self.options.url);
		self.error(err, callback);
	});

	this.request.on('error', function(err) {
		self.error(err, callback);
	});

	if (this.options.reqBody instanceof Buffer) {
		this.request.write(this.options.reqBody);
	}

	if (this.options.reqBody instanceof Stream && typeof this.options.reqBody.pipe === 'function') {
		this.options.reqBody.pipe(request);
		this.options.reqBody.resume();
	}

	this.request.end();
};

/**
 * Returns the standard result object, independent on which operation was executed
 *
 * @returns {module:request~stdResult} result The standard result
 */
Request.prototype.stdResult = function() {
	var ret = {
		method: this.options.method,
		code: this.response.statusCode,
		headers: this.response.headers,
		response: this.response,
		stream: this.stream,
		requests: this.options.reqId
	};

	if (this.url) {
		ret.url = this.url;
	}

	if (this.buffer) {
		ret.buffer = this.buffer;
	}

	if (this.file) {
		ret.file = this.file;
	}

	// This needs to be enabled only if there's an actual redirect response
	// for a call that uses the noRedirect option
	if (this.options.noRedirect && (ret.code === 301 || ret.code === 302 || ret.code === 303 || ret.code === 307)) {
		this.prepareRedirectUrl();

		ret.headers['redirect-to-url'] = this.options.url;
		if (this.options.headers.host) {
			ret.headers['redirect-to-host'] = this.options.headers.host;
		}
	}

	return ret;
};

/**
 * Sets options.noCompress and deletes the request headers that enable this functionality
 */
Request.prototype.setNoCompress = function() {
	this.options.noCompress = true;

	if (this.options.headers['accept-encoding']) {
		delete(this.options.headers['accept-encoding']);
	}
};

/**
 * Packages the Error object that bubbles up to the user completion callback
 *
 * @param {Error} error The input error
 * @param {module:request~stdError} callback Completion callback
 */
Request.prototype.error = function(error, callback) {
	tools.debug('error %s %s; error: %s', this.options.method, this.options.url, this.states.error);

	if (!this.states.error && !this.states.finish) {
		this.states.error = true;
		if (this.request) {
			this.request.abort();
		}

		if (!error.code && this.response) {
			error.code = this.response.statusCode;
		}

		if (this.response) {
			error.headers = this.response.headers;
		}
		error.url = this.options.url;
		error.method = this.options.method;

		callback(error);
	}
};

// The private API aka don't rely on it

/**
 * Convers all the request headers to lower case
 *
 * @private
 */
Request.prototype.normalizeHeaders = function() {
	var name, lowName, val;

	for (name in this.options.headers) {
		if (this.options.headers.hasOwnProperty(name)) {
			lowName = name.toLowerCase();
			val = this.options.headers[name];
			delete(this.options.headers[name]);
			this.options.headers[lowName] = val;
		}
	}
};

/**
 * Parses the URL for using the proper client and setting the request options
 *
 * @private
 */
Request.prototype.parseUrl = function() {
	this.options.parsedUrl = u.parse(this.options.url);

	this.options.parsedUrl.search = this.options.parsedUrl.search || '';
	this.options.parsedUrl.path = this.options.parsedUrl.pathname + this.options.parsedUrl.search;

	if (!this.options.parsedUrl.port) {
		if (this.options.parsedUrl.protocol === 'https:') {
			this.options.parsedUrl.port = 443;
		} else {
			this.options.parsedUrl.port = 80;
		}
	}

	if (this.options.agent) {
		this.reqOpt.agent = this.options.agent;
	}

	this.client = http;
	if (this.options.parsedUrl.protocol === 'https:') {
		this.client = https;

		if (this.options.noSslVerifier !== true) {
			this.reqOpt.rejectUnauthorized = true;
		} else {
			this.reqOpt.rejectUnauthorized = false;
		}

		this.reqOpt.ca = require('./ca-bundle.json');

		if ((this.options.ca instanceof Array) === true) {
			this.reqOpt.ca = this.reqOpt.ca.concat(this.options.ca);
		}

		if (!this.options.agent) {
			this.reqOpt.agent = new this.client.Agent(this.reqOpt);
		}
	}

	this.reqOpt.host = this.options.parsedUrl.hostname;
	this.reqOpt.port = this.options.parsedUrl.port;
	this.reqOpt.path = this.options.parsedUrl.path;

	if (this.options.parsedUrl.auth) {
		this.reqOpt.auth = this.options.parsedUrl.auth;
	}
};

/**
 * Prepares the redirect target for a Location header
 *
 * @private
 */
Request.prototype.prepareRedirectUrl = function() {
	var location = u.parse(this.response.headers.location);

	if (!location.protocol) {
		location.protocol = this.options.parsedUrl.protocol;
	}

	if (!location.host) {
		location.host = this.options.parsedUrl.host;
	} else {
		delete(this.options.headers.host);
	}

	this.options.url = u.format(location);
};

/**
 * Prepares the use proxy follow from the location header
 *
 * @private
 */
Request.prototype.prepareProxy = function() {
	var location = u.parse(this.response.headers.location);

	this.options.proxy = {
		host: location.hostname,
		port: location.port || 80
	};
};

/**
 * Prepares the request for a HTTP proxy
 *
 * @private
 */
Request.prototype.useProxy = function() {
	this.client = http;

	this.reqOpt.host = this.options.proxy.host;
	this.reqOpt.port = this.options.proxy.port;
	this.reqOpt.path = this.options.url;
};

/**
 * Saves the file modification time if the Last-Modified response header is sent
 *
 * @private
 * @param {Function} callback Completion callback
 */
Request.prototype.saveMtime = function(callback) {
	var self = this;

	fs.open(this.file, 'r', function(err, fd) {
		if (err) {
			self.error(err, callback);
			return;
		}

		var mtime = new Date(self.response.headers['last-modified']);
		var atime = new Date();

		fs.futimes(fd, atime, mtime, function() {
			fs.close(fd, function(err) {
				if (err) {
					self.error(err, callback);
					return;
				}

				self.finish(callback);
			});
		});
	});
};

/**
 * The success exit point for the Request.send inner wrapper
 *
 * @private
 * @param {Object} result The result argument passed by Request.send
 * @param {Function} callback (null, result) Completion callback
 */
Request.prototype.success = function(result, callback) {
	tools.debug('success %s %s; error: %s', this.options.method, this.options.url, this.states.error);

	if (!this.states.error && !this.states.success) {
		this.states.success = true;
		callback(null, result);
	}
};

/**
 * The success exit point for the Request.saveBuffer and Request.saveFile outer wrappers
 *
 * @private
 * @param {Function} callback (null, this.stdResult()) Completion callback
 */
Request.prototype.finish = function(callback) {
	tools.debug('finish %s %s; error: %s', this.options.method, this.options.url, this.states.error);

	if (!this.states.error && !this.states.finish) {
		this.states.finish = true;
		callback(null, this.stdResult());
	}
};

module.exports = Request;

// documentation section

/**
 * Describes the options Object passed to the {@link module:request~Request} constructor
 *
 * @typedef module:request~options
 * @type {Object}
 * @property {String} url Mandatory; the request URL
 * @property {String} method Mandatory; the HTTP method
 * @property {Object} headers Optional; the HTTP request headers
 * @property {Boolean} noCompress Optional; disables the Accept-Encoding HTTP request header. You may leave this job to the library itself. In case of gzip / deflate decoding errors, the request is transparently reissued with the options.noCompress flag
 * @property {Object} proxy Optional; issue the request through a HTTP proxy
 * @property {String} proxy.host The HTTP proxy host
 * @property {Number} proxy.port The HTTP proxy port
 * @property {Number} maxRedirects Optional; the limit for the subsequent HTTP redirects in order to avoid redirect loops. Defaults to 10 if unspecified / invalid input
 * @property {Number} maxBody Optional; indicates the maximum size of the buffered HTTP response body
 * @property {Number} timeout Optional; indicates the underlying [socket timeout](http://nodejs.org/docs/latest/api/net.html#net_socket_settimeout_timeout_callback) value in miliseconds. Defaults to 60 seconds
 * @property {module:request~progress} progress Optional; callback for tracking the request progress
 * @property {Boolean} noUserAgent Optional; disables the default User-Agent of http-request
 * @property {Array} ca Optional; supply your own Certificate Authority information. It *appends* your certificate(s) to the bundled list by defining the [ca of tls.connect()](http://nodejs.org/api/tls.html#tls_tls_connect_options_callback). The node.js standard behaviour is to replace the ca list
 * @property {Boolean} noSslValidation Optional; turns of the SSL validation. **Warning:** do this only if you know what you're doing and if you have proper reasons for doing it. Making SSL useless is not a small thing to do
 * @property {Boolean} stream Optional; passes a ReadableStream back to the completion callback of a HTTP request
 * @property {Boolean} noRedirect Optional; turns off the HTTP redirects. Passes back the headers and body of the redirect response. Adds a couple of response headers which indicate the redirection target: redirect-to-url - which indicates the target URL for the redirect as the location header might be a relative path, and redirect-to-host if there's a specified host header in the request
 * @property {Buffer|Stream} reqBody Optional; the contents of the request body for PUT, POST, etc. requests. Must be a Buffer or a Readable Stream instance. For Buffers, the content-length is Buffer.lenght. For a Readable Stream you must pass a content-length header, unless you're building a POST request with the [form-data](https://github.com/felixge/node-form-data) module. The library makes no assumptions about the content-type header, unless you're building a form with form-data
 * @property {Object} auth Optional; an Object that contains the authentication information. Currently it only implements HTTP Basic Authentication. The HTTP Basic Authentication was already supported by passing the username:password to the URL itself. This option provides a more API-friendly approach and it adds the basics for implementing HTTP Digest Authentication.
 * @property {String} auth.type The authentication type; Supported value: basic
 * @property {String} auth.username The HTTP Authentication username
 * @property {String} auth.password The HTTP Authentication password
 */

/**
 * Describes the progress callback
 *
 * @callback module:request~progress
 * @param {Number} current The current number of downloaded bytes
 * @param {Number} total The total number of bytes to download or 0 for chunked responses
 */

/**
 * Describes the standard error passed to the completion callback as instance of Error with additional properties. This packaged Error is returned only when the HTTP request was issued. If the call to a specific method fails due to various preconditions, then the passed error doesn't have the properties from below. You need to test for their existence
 *
 * @typedef module:request~stdError
 * @type {Error}
 * @property {String} method The HTTP method of the request
 * @property {String} url The url value passed to {@link module:request~options}
 * @property {String|Numeric|undefined} code The error code passed by a node.js internal binding or the HTTP status code. *undefined* otherwise
 * @property {Object|undefined} headers The HTTP response headers or *undefined* if no HTTP request is issued
 */

/**
 * Describes the standard result object passed to the completion callback
 *
 * @typedef module:request~stdResult
 * @type {Object}
 * @property {String} method The HTTP method of the request
 * @property {Number} code The HTTP status code
 * @property {Object} headers The HTTP response headers
 * @property {Stream} response The node.js [HTTP client response](http://nodejs.org/api/http.html#http_event_response)
 * @property {Stream} stream The HTTP response body as [Readable Stream](http://nodejs.org/api/stream.html#stream_class_stream_readable). The actual stream is either the [HTTP client response](http://nodejs.org/api/http.html#http_event_response) or the decoded stream by [zlib.createUnzip](http://nodejs.org/api/zlib.html#zlib_zlib_createunzip_options) if the Content-Encoding response header is either gzip or deflate. 204 and 304 responses, by RFC, don't pass back a response body
 * @property {Number} requests The number of HTTP requests that were sent for getting the response
 * @property {String | undefined} url The final URL, only if there was a succesful redirect
 * @property {Buffer | undefined} buffer The HTTP response body for buffered responses as [Buffer](http://nodejs.org/api/buffer.html) instance
 * @property {String | undefined} file The file path where the HTTP response body is saved, if applicable
 */

/**
 * Describes the completion callback of the inner wrappers {@link module:request~Request#saveBuffer} and {@link module:request~Request#saveFile}
 *
 * @callback module:request~innerCallback
 * @param {module:request~stdError} error The standard error
 * @param {module:request~stdResult} result The standard result. If you wrap {@link module:request~Request#saveBuffer} or {@link module:request~Request#saveFile} by yourself, you have to use the result passed to innerCallback instead of calling {@link module:request~Request#stdResult} if you want consistent results. When the request is reissued for a plain resource due to gzip or deflate decoding errors a new {@link module:request~Request} object is created internally in order to keep things simpler for requests that respond with success, but break things later. saveBuffer and saveFile use a simple recursive logic in this particular case
 */

/**
 * Describes the completion callback of the send method
 *
 * @callback module:request~sendCallback
 * @param {module:request~stdError} error The standard error or *null* on success
 * @param {module:request~sendResult} result The send result Object if the error is null
 */

/**
 * Describes the sendResult Object
 *
 * @typedef module:request~sendResult
 * @type {Object}
 * @property {Stream} response The HTTP response of node's http.request
 * @property {Stream} stream The HTTP response body. Uncompressed if it was encoded with gzip or deflate. Equal to response otherwise.
 * @property {String} url Optional, passed if there was a HTTP redirect. Contains the URL of the resource that returned a succesful status code.
 */