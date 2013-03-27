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
var EventEmitter = require('events').EventEmitter;

/**
 * The HTTP request wrapper
 *
 * @constructor
 *
 * @param {Object} options An Object for defining the HTTP client behavior
 *
 * @param {String} options.url Mandatory; the request URL
 * @param {String} options.method Mandatory; the HTTP method
 * @param {Object} options.headers Optional; the HTTP request headers
 * @param {Boolean} options.noCompress Optional; disables the Accept-Encoding HTTP request header. You may leave this job to the library itself. In case of gzip / deflate decoding errors, the request is transparently reissued with the options.noCompress flag
 * @param {Object} options.proxy Optional; issue the request through a HTTP proxy. Since proper HTTPS isn't possible with a proxy, the HTTPS support was dropped
 * @param {String} options.proxy.host The HTTP proxy host
 * @param {Number} options.proxy.port The HTTP proxy port
 * @param {Number} options.maxRedirects Optional; the limit for the subsequent HTTP redirects in order to avoid redirect loops. Defaults to 10 if unspecified / invalid input
 * @param {Number} options.maxBody Optional; indicates the maximum size of the buffered HTTP response body
 * @param {Number} options.timeout Optiona; indicates the underlying [socket timeout](http://nodejs.org/docs/latest/api/net.html#net_socket_settimeout_timeout_callback) value in miliseconds. Defaults to 60 seconds
 * @param {Function (current, total)} options.progress Optional; callback for tracking the request progress
 * @param {Number} options.progress.current The current number of downloaded bytes
 * @param {Number} options.progress.total The total number of bytes for the request, or 0 for chunked transfers
 * @param {Boolean} options.noUserAgent Optional; disables the default User-Agent of http-request
 * @param {Array} options.ca Optional; supply your own Certificate Authority information. It *appends* your certificate(s) to the bundled list by defining the [options.ca of tls.connect()](http://nodejs.org/api/tls.html#tls_tls_connect_options_callback). The node.js standard behaviour is to replace the options.ca list
 * @param {Boolean} options.noSslValidation Optional; turns of the SSL validation. **Warning:** do this only if you know what you're doing and if you have proper reasons for doing it. Making SSL useless is not a small thing to do
 * @param {Boolean} options.stream Optional; passes a ReadableStream back to the completion callback of a specific HTTP request
 * @param {Boolean} options.debug Optional; the protocol violations are silently dropped by default if the client is usable. By turning on this boolean flag, warnings are printed into STDERR via [util.debug](http://nodejs.org/api/util.html#util_util_debug_string). Do not use it in production as it blocks the event loop.
 *
 * @throws {options.url} The options object requires an input URL value.
 * @throws {options.method} The options object requres a HTTP method value.
 * @throws {options.maxBody} Invalid options.maxBody specification. Expecting a proper integer value.
 * @throws {options.progress} Expecting a function as progress callback.
 */
function Request(options) {
	if (!options.url) {
		throw new Error('The options object requires an input URL value.');
	}

	if (!options.method) {
		throw new Error('The options object requres a HTTP method value.');
	}
	options.method = options.method.toUpperCase();

	this.options = options;
	this.reqOpt = {};
	this.client = http;

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

	if (!this.options.noCompress) {
		if (!this.options.headers['accept-encoding']) {
			this.options.headers['accept-encoding'] = 'gzip,deflate';
		}
	} else if (this.options.headers['accept-encoding']) {
		delete(this.options.headers['accept-encoding']);
	}

	if (!this.options.headers['user-agent'] && !this.options.noUserAgent) {
		this.options.headers['user-agent'] = util.format('http-request/v%s (https://github.com/SaltwaterC/http-get) node.js/%s', config.version, process.version);
	}

	if (this.options.maxBody) {
		this.options.maxBody = tools.absInt(this.options.maxBody);
		if (!this.options.maxBody) {
			throw new Error('Invalid options.maxBody specification. Expecting a proper integer value.');
		}
	}

	if (this.options.progress && typeof this.options.progress !== 'function') {
		throw new Error('Expecting a function as progress callback.');
	}

	if (!this.options.proxy) {
		this.parseUrl();
	} else {
		this.reqOpt.host = this.options.proxy.host;
		this.reqOpt.port = this.options.proxy.port;
		this.reqOpt.path = this.options.url;
	}

	this.reqOpt.headers = this.options.headers;

	if (!this.options.reqId) {
		this.options.reqId = 1;
	}

	if (this.options.bufferType) {
		console.error('Warning: the bufferType option is deprecated. There is only a single buffer implementation using the node.js Buffer object.');
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
 * @param {Function (error, buffer)} callback Completion callback
 * @param {Error} callback.error passed to the callback on buffering errors
 * @param {Buffer} callback.buffer the HTTP response body buffer
 */
Request.prototype.saveBuffer = function(callback) {
	var self = this;
	var buf = [],
		size = 0;

	self.stream.on('data', function(data) {
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

	self.stream.on('end', function() {
		self.buffer = Buffer.concat(buf, size);
		self.finish(callback);
	});

	self.stream.on('error', function(err) {
		self.error(err, callback);
	});

	self.response.resume();
};

/**
 * Saves to file the HTTP response body
 *
 * @param {String} file The file path where the HTTP stream is saved
 * @param {Function (error, file)} callback Completion callback
 * @param {Error} callback.error passed to the callback on write steam errors
 * @param {String} callback.file the path to the file where the HTTP body is saved
 */
Request.prototype.saveFile = function(file, callback) {
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

	this.stream.pipe(ws);
	this.response.resume();
};

/**
 * Issues the outgoing HTTP request
 *
 * @param {Function (error, result)} callback Completion callback
 *
 * @param {Error} callback.error An Error explaining what went wrong
 * @param {Object} callback.result An Object containing the following keys: response, stream, url
 *
 * @param {Stream} callback.result.response The HTTP response of node's http.request
 * @param {Stream} callback.result.stream The HTTP response body. Uncompressed if it was encoded with gzip or deflate. Equal to response otherwise.
 * @param {String} callback.result.url Optional, passed if there was a HTTP redirect. Contains the URL of the resource that returned a succesful status code.
 *
 * @throws {callback} Expecting a function for callback on URL {@link module:request~Request} options.url.
 */
Request.prototype.send = function(callback) {
	var self = this;

	if (typeof callback !== 'function') {
		throw tools.formatError('Expecting a function for callback on URL %s.', self.options.url);
	}

	var request = self.client.request(self.reqOpt, function(response) {
		self.response = response;
		response.pause();

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

		switch (response.statusCode) {
			// success
			case 200:
				// OK
			case 203:
				// Non-Authoritative Information
			case 206:
				// Partial Content
				var ret = {
					response: response,
					stream: stream
				};

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
				} else {
					ret.url = undefined;
				}

				self.url = ret.url;
				self.success(ret, callback);
				break;

				// redirect requests, handled if they have a valid Location header
			case 300:
				// Multiple Choices - XXX: need to study if it actually sends location, otherwise pass it as "user" error as it buffers the response
			case 301:
				// Moved Permanently
			case 302:
				// Found
			case 303:
				// See Other
			case 305:
				// Use Proxy - XXX: need to study this properly
			case 307:
				// Temporary Redirect
				if (!response.headers.location) {
					self.error(new Error('Redirect response without the Location header.'), callback);
				} else {
					if (self.options.reqId < self.options.maxRedirects) {
						self.prepareRedirectUrl();
						self.options.reqId++;
						self.parseUrl();
						self.send(callback);
						response.resume();
					} else {
						self.error(tools.formattedError('Redirect loop detected after %d requests.', self.options.reqId), callback);
					}
				}
				break;

				// sucessful requests without response body
			case 204:
				// No Content
			case 304:
				// Not Modified
				throw new Error('TO IMPLEMENT ' + response.statusCode);

				// user errors
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

				err.document = '';
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

				response.resume();
				break;

				// catch all error handler
			default:
				self.error(tools.formattedError('HTTP Error: %d', response.statusCode), callback);
				break;
		}
	});

	request.on('error', function(err) {
		self.error(err, callback);
	});

	if (self.options.reqBody instanceof Buffer) {
		request.write(self.options.reqBody);
	}

	if (self.options.reqBody instanceof Stream) {
		self.options.reqBody.resume();
		self.options.reqBody.pipe(request);
	}

	request.end();

	this.request = request;
};

/**
 * Returns the standard result object, independent on which operation was executed
 *
 * @example
return {
  code: response.statusCode, // Numeric, HTTP status code
  headers: response.headers, // Object, HTTP response headers
  url: request.url, // undefined | String, the final URL if successful redirect
  buffer: request.buffer, // undefined | Buffer, the HTTP response body
  file: request.file, // undefined | String, the file path where the body is saved
  stream: request.stream // undefined | Stream, the HTTP body ReadableStream
};
 * @returns {Object} result Wrapper for the result Object returned to the user
 */
Request.prototype.stdResult = function() {
	return {
		code: this.response.statusCode,
		headers: this.response.headers,
		response: this.response,
		url: this.url,
		buffer: this.buffer,
		file: this.file,
		stream: this.stream
	};
};

// The private API aka don't rely on it

/**
 * Convers all the request headers to lower case
 *
 * @private
 */
Request.prototype.normalizeHeaders = function() {
	var name;

	for (name in this.headers) {
		if (this.headers.hasOwnProperty(name)) {
			var lowName = name.toLowerCase();
			var val = this.headers[name];
			delete(this.headers[name]);
			this.headers[lowName] = val;
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

		this.reqOpt.agent = new this.client.Agent(this.reqOpt);
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
	}

	this.options.url = u.format(location);
};

/**
 * Saves the file modification time if the Last-Modified response header is sent
 *
 * @private
 * @param {Function} callback Completion callback
 */
Request.prototype.saveMtime = function(callback) {
	var self = this;

	fs.open(self.file, 'r', function(err, fd) {
		if (err) {
			self.error(err, callback);
		} else {
			var mtime = new Date(self.response.headers['last-modified']);
			var atime = new Date();

			fs.futimes(fd, atime, mtime, function() {
				fs.close(fd, function(err) {
					if (err) {
						self.error(err, callback);
					} else {
						callback(null, self.file);
					}
				});
			});
		}
	});
};

/**
 * Packages the Error object that bubbles up to the user completion callback
 *
 * @private
 * @param {Error} error The input error
 * @param {Function (error)} callback Completion callback
 *
 * @param {Error} callback.error The input Error object, passed to the completion callback
 * @param {Number} callback.error.code The Error code if define, the HTTP status code otherwise
 * @param {Object} callback.error.headers The HTTP response headers
 * @param {String} callback.error.url The input URL
 */
Request.prototype.error = function(error, callback) {
	tools.debug('error %s %s; error: %s', this.options.method, this.options.url, this.states.error);

	if (!this.states.error && !this.states.finish) {
		this.states.error = true;
		this.request.abort();

		error.code = error.code || this.response.statusCode;
		if (this.response) {
			error.headers = this.response.headers;
		}
		error.url = this.options.url;

		callback(error);
	}
};

/**
 * The success exit point for the Request.send inner wrapper
 *
 * @private
 * @param {Object} result The result argument passed by Request.send
 * @param {Function (null, result)} callback Completion callback
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
 * @param {Function (null, this.stdResult())} callback Completion callback
 */
Request.prototype.finish = function(callback) {
	tools.debug('finish %s %s; error: %s', this.options.method, this.options.url, this.states.error);

	if (!this.states.error && !this.states.finish) {
		this.states.finish = true;
		callback(null, this.stdResult());
	}
};

module.exports = Request;
