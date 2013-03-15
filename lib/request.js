'use strict';

/* local modules */
var tools = require('./tools.js');
var config = require('../package.json');

/* core modules */
var u = require('url');
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
	
	options.url = String(options.url).trim();
	if ( ! options.url.match(/^https?:\/\//i)) {
		// assuming HTTP for URLs' like www.example.com/foo.bar
		options.url = 'http://' + options.url;
	}
	
	if ( ! options.headers) {
		options.headers = {};
	}
	
	options.headers = this.normalizeHeaders(options.headers);
	
	if (options.maxRedirects) {
		options.maxRedirects = this.absInt(options.maxRedirects);
	}
	
	// if you think this is stupid instead of using "else"
	// absInt may return 0 on junk input
	if ( ! options.maxRedirects) {
		options.maxRedirects = 10;
	}
	
	if (options.timeout) {
		options.timeout = this.absInt(options.timeout);
	}
	
	if ( ! options.timeout) {
		// if the socket is idle more than a minute, something is really wrong
		options.timeout = 60000;
	}
	
	if ( ! options.noCompress) {
		if ( ! options.headers['accept-encoding']) {
			options.headers['accept-encoding'] = 'gzip,deflate';
		}
	} else if (options.headers['accept-encoding']) {
		delete(options.headers['accept-encoding']);
	}
	
	if ( ! options.headers['user-agent'] && ! options.noUserAgent) {
		options.headers['user-agent'] = util.format('http-request/v%s (https://github.com/SaltwaterC/http-get) node.js/%s', config.version, process.version);
	}
	
	if (options.maxBody) {
		options.maxBody = this.absInt(options.maxBody);
		if ( ! options.maxBody) {
			throw new Error('Invalid options.maxBody specification. Expecting a proper integer value.');
		}
	}
	
	if (options.progress && typeof options.progress !== 'function') {
		throw new Error('Expecting a function as progress callback.');
	}
	
	var reqOpt = {}, client = http;
	
	if ( ! options.proxy) {
		options.parsedUrl = u.parse(options.url);
		
		options.parsedUrl.search = options.parsedUrl.search || '';
		options.parsedUrl.path = options.parsedUrl.pathname + options.parsedUrl.search;
		
		if ( ! options.parsedUrl.port) {
			if (options.parsedUrl.protocol === 'https:') {
				options.parsedUrl.port = 443;
			} else {
				options.parsedUrl.port = 80;
			}
		}
		
		if (options.parsedUrl.protocol === 'https:') {
			client = https;
		}
		
		reqOpt.host = options.parsedUrl.hostname;
		reqOpt.port = options.parsedUrl.port;
		reqOpt.path = options.parsedUrl.path;
		
		if (options.parsedUrl.auth) {
			reqOpt.auth = options.parsedUrl.auth;
		}
	} else {
		reqOpt.host = options.proxy.host;
		reqOpt.port = options.proxy.port;
		reqOpt.path = options.url;
	}
	
	if (options.parsedUrl.protocol === 'https:') {
		if (options.noSslVerifier !== true) {
			reqOpt.rejectUnauthorized = true;
		} else {
			reqOpt.rejectUnauthorized = false;
		}
		
		reqOpt.ca = require('./ca-bundle.json');
		
		if ((options.ca instanceof Array) === true) {
			reqOpt.ca = reqOpt.ca.concat(options.ca);
		}
		
		reqOpt.agent = new client.Agent(reqOpt);
	}
	
	reqOpt.headers = options.headers;
	
	if ( ! options.reqId) {
		options.reqId = 1;
	}
	
	reqOpt.headers = options.headers;
	
	if (options.bufferType) {
		console.error('Warning: the bufferType option is deprecated. There is only a single buffer implementation using the node.js Buffer object.');
	}
	
	this.options = options;
	this.reqOpt = reqOpt;
	this.client = client;
	
	this.aborted = false;
}

// the Request object is also an EventEmitter
util.inherits(Request, EventEmitter);

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
						self.abort();
						
						err = new Error('Redirect response without the Location header.');
						
						err.code = response.statusCode;
						err.headers = response.headers;
						err.url = self.options.url;
						
						cb(err);
					}
				} else {
					self.options.url = self.prepareRedirectUrl(self.options.url, response.headers.location);
					
					if (self.options.reqId < self.options.maxRedirects) {
						self.options.reqId++;
						new Request(self.options).send(cb);
						response.resume();
					} else {
						if ( ! self.aborted) {
							self.abort();
							
							err = tools.formattedError('Redirect loop detected after %d requests.', self.options.reqId);
							
							err.code = response.statusCode;
							err.headers = response.headers;
							err.url = self.options.url;
							
							cb(err);
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
					self.abort();
					
					err = tools.formattedError('HTTP Error: %d', response.statusCode);
					
					err.code = response.statusCode;
					err.headers = response.headers;
					err.url = self.options.url;
					
					cb(err);
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
Request.prototype.normalizeHeaders = function (headers) {
	var name;
	
	for (name in headers) {
		if (headers.hasOwnProperty(name)) {
			var lowName = name.toLowerCase();
			var val = headers[name];
			delete(headers[name]);
			headers[lowName] = val;
		}
	}
	
	return headers;
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

module.exports = Request;
