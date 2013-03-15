'use strict';

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
 * The main object of this library, HTTP request wrapper
 *
 * @param {Object} options
 */
function Request(options) {
	if ( ! options.url) {
		throw new Error('The options object requires an input URL value.');
	}
	
	if ( ! options.method) {
		throw new Error('The options object requres a HTTP method value.');
	}
	options.method = options.method.toUpperCase();
	
	this.options = options;
	this.reqOpt = {};
	this.client = http;
	
	this.options.url = String(this.options.url).trim();
	if ( ! this.options.url.match(/^https?:\/\//i)) {
		// assuming HTTP for URLs' like www.example.com/foo.bar
		this.options.url = 'http://' + this.options.url;
	}
	
	if ( ! this.options.headers) {
		this.options.headers = {};
	}
	this.normalizeHeaders();
	
	if (this.options.maxRedirects) {
		this.options.maxRedirects = this.absInt(this.options.maxRedirects);
	}
	
	// if you think this is stupid instead of using "else"
	// absInt may return 0 on junk input
	if ( ! this.options.maxRedirects) {
		this.options.maxRedirects = 10;
	}
	
	if (this.options.timeout) {
		this.options.timeout = this.absInt(this.options.timeout);
	}
	
	if ( ! this.options.timeout) {
		// if the socket is idle more than a minute, something is really wrong
		this.options.timeout = 60000;
	}
	
	if ( ! this.options.noCompress) {
		if ( ! this.options.headers['accept-encoding']) {
			this.options.headers['accept-encoding'] = 'gzip,deflate';
		}
	} else if (this.options.headers['accept-encoding']) {
		delete(this.options.headers['accept-encoding']);
	}
	
	if ( ! this.options.headers['user-agent'] && ! this.options.noUserAgent) {
		this.options.headers['user-agent'] = util.format('http-request/v%s (https://github.com/SaltwaterC/http-get) node.js/%s', config.version, process.version);
	}
	
	if (this.options.maxBody) {
		this.options.maxBody = this.absInt(this.options.maxBody);
		if ( ! this.options.maxBody) {
			throw new Error('Invalid options.maxBody specification. Expecting a proper integer value.');
		}
	}
	
	if (this.options.progress && typeof this.options.progress !== 'function') {
		throw new Error('Expecting a function as progress callback.');
	}
	
	if ( ! this.options.proxy) {
		this.parseUrl();
	} else {
		this.reqOpt.host = this.options.proxy.host;
		this.reqOpt.port = this.options.proxy.port;
		this.reqOpt.path = this.options.url;
	}
	
	this.reqOpt.headers = this.options.headers;
	
	if ( ! this.options.reqId) {
		this.options.reqId = 1;
	}
	
	if (this.options.bufferType) {
		console.error('Warning: the bufferType option is deprecated. There is only a single buffer implementation using the node.js Buffer object.');
	}
	
	this.aborted = false;
}

// the Request object is also an EventEmitter
util.inherits(Request, EventEmitter);

/**
 * Parses the URL for using the proper client and setting the request options
 */
Request.prototype.parseUrl = function () {
	this.options.parsedUrl = u.parse(this.options.url);
	
	this.options.parsedUrl.search = this.options.parsedUrl.search || '';
	this.options.parsedUrl.path = this.options.parsedUrl.pathname + this.options.parsedUrl.search;
	
	if ( ! this.options.parsedUrl.port) {
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
 * Issues the outgoing HTTP(S) request
 *
 * @param {Function} cb
 */
Request.prototype.send = function (cb) {
	var self = this;
	
	if (typeof cb !== 'function') {
		throw tools.formatError('Expecting a function for callback on URL %s.', self.options.url);
	}
	
	var request = self.client.request(self.reqOpt, function (response) {
		self.response = response;
		response.pause();
		
		var err;
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
			case 200: // OK
			case 203: // Non-Authoritative Information
			case 206: // Partial Content
				var ret = {
					response: response,
					stream: stream
				};
				
				if (self.options.reqId > 1) {
					ret.url = self.options.url;
				} else {
					ret.url = undefined;
				}
				
				self.url = ret.url;
				
				cb(null, ret);
			break;
			
			// redirect requests, handled if they have a valid Location header
			case 300: // Multiple Choices - XXX: need to study if it actually sends location, otherwise pass it as "user" error as it buffers the response
			case 301: // Moved Permanently
			case 302: // Found
			case 303: // See Other
			case 305: // Use Proxy - XXX: need to study this properly
			case 307: // Temporary Redirect
				if ( ! response.headers.location) {
					if ( ! self.aborted) {
						self.error(new Error('Redirect response without the Location header.'), cb);
					}
				} else {
					self.options.url = self.prepareRedirectUrl(self.options.url, response.headers.location);
					
					if (self.options.reqId < self.options.maxRedirects) {
						self.options.reqId++;
						delete(self.options.parsedUrl);
						self.parseUrl();
						self.send(cb);
						response.resume();
					} else {
						if ( ! self.aborted) {
							self.error(tools.formattedError('Redirect loop detected after %d requests.', self.options.reqId), cb);
						}
					}
				}
			break;
			
			// sucessful requests without response body
			case 204: // No Content
			case 304: // Not Modified
				throw new Error('TO IMPLEMENT ' + response.statusCode);
			
			// user errors
			case 400: // Bad Request
			case 401: // Unauthorized
			case 402: // Payment Required
			case 403: // Forbidden
			case 404: // Not Found
			case 405: // Method Not Allowed
			case 406: // Not Acceptable
			case 407: // Proxy Authentication Required
			case 408: // Request Timeout
			case 409: // Conflict
			case 410: // Gone
			case 411: // Length Required
			case 412: // Precondition Failed
			case 413: // Request Entity Too Large
			case 414: //Request-URI Too Long
			case 415: // Unsupported Media Type
			case 416: // Requested Range Not Satisfiable
			case 417: // Expectation Failed
				err = tools.formattedError('HTTP Error: %d', response.statusCode);
				
				err.code = response.statusCode;
				err.headers = response.headers;
				err.document = '';
				err.largeDocument = false;
				err.noDocument = false;
				err.url = self.options.url;
				
				var buf = [], size = 0;
				
				stream.on('data', function (data) {
					buf.push(data);
					size += data.length;
					
					if ( ! self.aborted && size > 1048576) {
						self.abort();
						
						err.largeDocument = true;
						cb(err);
					}
				});
				
				stream.on('end', function () {
					if ( ! self.aborted) {
						err.document = Buffer.concat(buf, size);
						cb(err);
					}
				});
				
				stream.on('error', function (zErr) {
					if ( ! self.aborted) {
						self.abort();
						
						err.noDocument = true;
						err.message = zErr.message;
						cb(err);
					}
				});
				
				response.resume();
			break;
			
			// catch all error handler
			default:
				if ( ! self.aborted) {
					self.error(tools.formattedError('HTTP Error: %d', response.statusCode), cb);
				}
			break;
		}
	});
	
	request.on('error', function (err) {
		if ( ! self.aborted) {
			self.aborted = true;
			
			err.url = self.options.url;
			
			cb(err);
		}
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
 * Convers all the request headers to lower case
 *
 * @param {Object} headers
 * @returns {Object} headers
 */
Request.prototype.normalizeHeaders = function () {
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
 * Prepares the redirect target
 *
 * @param {String} url
 * @param {String} location
 * @returns {String}
 */
Request.prototype.prepareRedirectUrl = function (url, location) {
	var original = u.parse(url);
	location = u.parse(location);
	
	if ( ! location.protocol) {
		location.protocol = original.protocol;
	}
	
	if ( ! location.host) {
		location.host = original.host;
	}
	
	return u.format(location);
};

/*jslint bitwise:true*/
/**
 * Makes sure the input is parsed as absolute integer or 0 on NaN
 *
 * @param value
 * @returns {Number} int
 */
Request.prototype.absInt = function (value) {
	return Math.abs(parseInt(value, 10) | 0);
};
/*jslint bitwise:false*/

/**
 * Aborts the request and closes all the used resources
 */
Request.prototype.abort = function () {
	this.aborted = true;
	this.request.abort();
};

/**
 * Returns the value of the Content-Length header or zero for chunked transfers
 *
 * @returns {Numeric}
 */
Request.prototype.contentLength = function () {
	return this.absInt(this.response.headers['content-length']);
};

/**
 * Packages the Error object with all the relevant information
 *
 * @param {Object} error
 * @param {Function} callback
 */
Request.prototype.error = function (error, callback) {
	this.abort();
	
	error.code = error.code || this.response.statusCode;
	error.headers = this.response.headers;
	error.url = this.options.url;
	
	callback(error);
};

/**
 * Buffers the output of a HTTP stream
 *
 * @param {Function} callback
 */
Request.prototype.saveBuffer = function (callback) {
	var self = this;
	var buf = [], size = 0;
	
	self.stream.on('data', function (data) {
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
		
		if (self.options.progress) {
			var total = self.contentLength();
			self.options.progress(size, total);
		}
		
		if (err && ! self.aborted) {
			self.error(err, callback);
		}
	});
	
	self.stream.on('end', function () {
		if ( ! self.aborted) {
			self.buffer = Buffer.concat(buf, size);
			callback(null, self.buffer);
		}
	});
	
	self.stream.on('error', function (err) {
		if ( ! self.aborted) {
			self.error(err, callback);
		}
	});
	
	self.response.resume();
};

/**
 * Saves to file the output of a HTTP stream
 *
 * @param {String} file
 * @param {Function} cb
 */
Request.prototype.saveFile = function (file, callback) {
	var self = this;
	var ws = fs.createWriteStream(file);
	
	ws.on('error', function (err) {
		if ( ! self.aborted) {
			self.error(err, callback);
		}
	});
	
	ws.on('close', function () {
		if ( ! self.aborted) {
			self.file = file;
			callback(null, self.file);
		}
	});
	
	self.stream.pipe(ws);
	self.response.resume();
};

/**
 * Returns the standard result object
 *
 * @returns {Object}
 */
Request.prototype.stdResult = function () {
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

module.exports = Request;
