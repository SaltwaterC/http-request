'use strict';

/* internal modules */
var tools = require('./tools.js');

/* 3rd party module */
require('buffer-concat');

/* core modules */
var fs = require('fs');
var u = require('url');
var p = require('path');
var util = require('util');
var zlib = require('zlib');
var http = require('http');
var https = require('https');
var EventEmitter = require('events').EventEmitter;

/* 3rd party module */
var semver = require('semver');

/**
 * Patches in the http.head() method
 * 
 * @param {Object} options
 * @param {Function} cb
 * @returns {Object}
 */
http.head = function (options, cb) {
	options.method = 'HEAD';
	var req = http.request(options, cb);
	req.end();
	return req;
};

/**
 * Patches in the https.head() method
 * 
 * @param {Object} options
 * @param {Function} cb
 * @returns {Object}
 */
https.head = function (options, cb) {
	options.method = 'HEAD';
	var req = https.request(options, cb);
	req.end();
	return req;
};

/**
 * Sets the http.Agent.defaultMaxSockets property
 * 
 * @param value
 */
var setMaxSockets = function (value) {
	value = tools.absInt(value);
	if ( ! value) { // fallback to the default
		value = 5;
	}
	http.Agent.defaultMaxSockets = value;
};
exports.setMaxSockets = setMaxSockets;

/**
 * The http.get() method
 * 
 * @param {Object} options
 * @param {String} file
 * @param {Function} cb
 */
var get = function (options, file, cb) {
	var usrErr;
	
	if (typeof options === 'string') {
		options = {url: options};
	}
	
	if (typeof file === 'function') {
		cb = file;
		file = false;
	} else {
		if (file !== null) {
			file = String(file).trim();
			file = p.resolve(file);
		}
	}
	
	if ( ! options.url) {
		cb(tools.formattedError('The options object requires an input URL value.'));
		return;
	}
	
	if (file === false && options.maxBody) {
		options.maxBody = tools.absInt(options.maxBody);
		if ( ! options.maxBody) {
			usrErr = tools.formattedError('Invalid options.maxBody specification.');
			usrErr.url = options.url;
			cb(usrErr);
			return;
		}
	}
	
	if (options.progress && typeof options.progress !== 'function') {
		usrErr = tools.formattedError('The progress option must be a callback function.');
		usrErr.url = options.url;
		cb(usrErr);
		return;
	}
	
	if (options.stream !== true && file === false) {
		options.bufferType = options.bufferType || 'string';
		if (options.bufferType !== 'string' && options.bufferType !== 'buffer') {
			console.error('Warning: The passed bufferType is not valid. Expected: string or buffer. Falling back to string.');
			options.bufferType = 'string';
		}
		
		if (options.bufferType === 'string') {
			console.error('Warning: The options.bufferType = "string" option is deprecated. Use options.bufferType = "buffer"; instead.');
			
			if (options.encoding) {
				console.error('Warning: The encoding option is deprecated. Use options.bufferType = "buffer"; as the String buffers are deprecated.');
			} else {
				options.encoding = 'utf8';
			}
		}
	}
	
	var input = tools.processInput(options);
	var opt = input.opt;
	var client = input.client;
	var url = input.url;
	options = input.options;
	
	var processRequest = function (req) {
		req.on('response', function (res) {
			// workaround for the node.js v0.10 issue with Stream hanging the event loop
			res.resume();
			
			var err, ret, stream, unzip, buf, size;
			
			var currLen = 0;
			var totalLen = tools.absInt(res.headers['content-length']);
			
			switch (res.statusCode) {
				case 200: // OK
				case 206: // Partial Content
					if (options.noCompress && res.headers['content-encoding']) {
						if (semver.satisfies(process.version, '>=0.6.18')) {
							if (options.debug) {
								console.error('Warning: the server sent %s content without being requested for %s.', res.headers['content-encoding'], u.format(url));
							}
						} else {
							err = tools.formattedError('The server sent %s content without being requested.', res.headers['content-encoding']);
							err.code = res.statusCode;
							err.headers = res.headers;
							err.url = options.url;
							cb(err);
							return;
						}
					}
					
					var aborted = false;
					var retry = true;
					
					res.on('close', function () {
						if ( ! aborted) {
							aborted = true;
							req.abort();
							
							if ( ! options.noCompress) {
								if (retry) {
									// retry the request without compression
									delete(options.headers['accept-encoding']);
									options.noCompress = true;
									if (typeof file === 'string') {
										get(options, file, cb);
									} else {
										get(options, cb);
									}
								}
							} else {
								// TODO: Check if Content-Lenght is set, retry with a range request in order to continue the download
								err = tools.formattedError('The server prematurely closed the connection.');
								err.code = res.statusCode;
								err.headers = res.headers;
								err.url = options.url;
								cb(err);
							}
						}
					});
					
					switch (res.headers['content-encoding']) {
						case 'gzip':
						case 'deflate':
							unzip = zlib.createUnzip();
							stream = res.pipe(unzip);
							
							// attach the error listener only when the stream isn't passed back to the user
							if (options.stream !== true) {
								// this works only in node.js v0.6.18+
								unzip.on('error', function (err) {
									if ( ! aborted) {
										aborted = true;
										req.abort();
										err.url = options.url;
										cb(err);
									}
								});
							}
						break;
						
						default: // no compression
							stream = res;
						break;
					}
					
					if (options.stream === true) {
						stream.pause();
						ret = {
							code: res.statusCode,
							headers: res.headers,
							stream: stream
						};
						if (options.reqId > 1) {
							ret.url = options.url;
						}
						cb(null, ret);
						
						return;
					}
					
					if (file) { // saving to file
						var ws = fs.createWriteStream(file);
						var transfer = new EventEmitter();
						
						// this machinery is here to make sure that when the callback is called
						// there won't be ENOENT errors for other code that expects this file to be on the disk
						// this bit is here for the situations where the Writable Stream open event is emitted after the transfer is finished
						transfer.on('end', function () {
							transfer.removeAllListeners('end');
							ws.on('open', function (fd) {
								tools.endFileTransfer(fd, res.headers['last-modified'], ws);
							});
						});
						
						// this machinery is here to make sure that when the callback is called
						// there won't be ENOENT errors for other code that expects this file to be on the disk
						ws.on('open', function (fd) {
							transfer.on('end', function () {
								transfer.removeAllListeners('end');
								tools.endFileTransfer(fd, res.headers['last-modified'], ws);
							});
						});
						
						ws.on('error', function (err) {
							aborted = true;
							req.abort();
							err.url = options.url;
							cb(err);
						});
						
						ws.on('close', function () {
							if ( ! aborted) {
								ret = {
									code: res.statusCode,
									headers: res.headers,
									file: file
								};
								if (options.reqId > 1) {
									ret.url = options.url;
								}
								cb(null, ret);
							}
						});
						
						stream.on('data', function (data) {
							if ( ! aborted) {
								currLen = tools.doProgress(options.progress, data, currLen, totalLen);
								try {
									ws.write(data);
								} catch (e) {
									// handled by the error listener from above
									// in fact, it is retarded that an async method throws an Error
									// instead of just emitting the error event
								}
							}
						});
						
						stream.on('end', function () {
							transfer.emit('end');
						});
					} else if (file === false) { // buffered response
						size = 0;
						buf = [];
						
						stream.on('data', function (data) {
							if ( ! aborted) {
								currLen = tools.doProgress(options.progress, data, currLen, totalLen);
								buf.push(data);
								size += data.length;
								
								// SlowBuffer is limited to 0x3FFFFFFF bytes aka 1073741823
								if (size > 1073741823) {
									retry = false;
									aborted = true;
									req.abort();
									
									err = tools.formattedError('Buffer too large. node.js limits the SlowBuffer implementation to 1073741823 bytes.');
									err.code = res.statusCode;
									err.headers = res.headers;
									err.url = options.url;
									
									cb(err);
								}
								
								if (options.maxBody) {
									if (size > options.maxBody) {
										retry = false;
										aborted = true;
										req.abort();
										
										err = tools.formattedError('Large body detected.');
										
										err.code = res.statusCode;
										err.headers = res.headers;
										err.url = options.url;
										
										cb(err);
									}
								}
							}
						});
						
						stream.on('end', function () {
							if ( ! aborted) {
								ret = {
									code: res.statusCode,
									headers: res.headers,
									buffer: Buffer.concat(buf, size)
								};
								
								if (options.bufferType === 'string') {
									ret.buffer = ret.buffer.toString(options.encoding);
								}
								
								if (options.reqId > 1) {
									ret.url = options.url;
								}
								
								cb(null, ret);
							}
						});
					} else if (file === null) { // discard the response body, equivalent of sending the data to /dev/null
						ret = {
							code: res.statusCode,
							headers: res.headers
						};
						
						if (options.reqId > 1) {
							ret.url = options.url;
						}
						
						cb(null, ret);
					}
				break;
				
				case 300: // redirect requests, handled if they have a valid Location header
				case 301:
				case 302:
				case 303:
				case 305:
				case 307:
					if ( ! res.headers.location) {
						err = tools.formattedError('Redirect response without the Location header.');
						err.code = res.statusCode;
						err.headers = res.headers;
						err.url = options.url;
						cb(err);
					} else {
						options.url = tools.prepareRedirectUrl(url, res.headers.location);
						
						if (options.reqId < options.maxRedirects) {
							if (file === false) {
								file = cb;
							}
							
							get(options, file, cb);
						} else {
							err = tools.formattedError('Redirect loop detected after %d requests.', options.reqId);
							err.code = res.statusCode;
							err.headers = res.headers;
							err.url = options.url;
							cb(err);
						}
					}
				break;
				
				case 204: // No Content
				case 304: // Not Modified
					ret = {
						code: res.statusCode,
						headers: res.headers
					};
					if (options.reqId > 1) {
						ret.url = options.url;
					}
					cb(null, ret);
				break;
				
				case 203: // Non-Authoritative Information
				case 400: // all the "user" errors
				case 401:
				case 403:
				case 404:
				case 405:
				case 406:
				case 407:
				case 408:
				case 409:
				case 410:
				case 411:
				case 412:
				case 413:
				case 414:
				case 415:
				case 416:
				case 417:
					// this is an error, duh, but fetching the error body takes some time
					err = tools.formattedError('HTTP Error: %d', res.statusCode);
					err.code = res.statusCode;
					err.headers = res.headers;
					err.document = '';
					err.largeDocument = false;
					err.noDocument = false;
					
					// can't trust the damn thing to avoid race conditions all by itself
					var fetchBody = true;
					
					// the collector buffer
					size = 0;
					buf = [];
					
					switch (res.headers['content-encoding']) {
						case 'gzip':
						case 'deflate':
							unzip = zlib.createUnzip();
							stream = res.pipe(unzip);
							
							// this works only in node.js v0.6.18+
							unzip.on('error', function (zerr) {
								if (fetchBody) {
									fetchBody = false;
									err.noDocument = true;
									err.message = zerr.message;
									err.url = options.url;
									cb(err);
								}
							});
						break;
						
						default: // no compression
							stream = res;
						break;
					}
					
					stream.on('data', function (data) {
						if (fetchBody) {
							buf.push(data);
							size += data.length;
							
							if (fetchBody && size > 1048576) {
								fetchBody = false;
								err.largeDocument = true;
								err.url = options.url;
								cb(err);
							}
						}
					});
					
					stream.on('end', function () {
						if (fetchBody) {
							fetchBody = false;
							err.document = Buffer.concat(buf, size);
							
							if (options.bufferType === 'string') {
								err.document = err.document.toString(options.encoding);
							}
							
							err.url = options.url;
							cb(err);
						}
					});
				break;
				
				default: // error
					err = tools.formattedError('HTTP Error: %d', res.statusCode);
					err.code = res.statusCode;
					err.headers = res.headers;
					err.url = options.url;
					cb(err);
				break;
			}
		});
		
		req.on('error', function (err) {
			err.url = options.url;
			cb(err);
		});
		
		req.setTimeout(options.timeout, function () {
			var err = tools.formattedError('Timeout of %d miliseconds reached for GET %s.', options.timeout, options.url);
			err.url = options.url;
			cb(err);
			req.abort();
			return;
		});
		
		req.end();
	};
	processRequest(client.get(opt));
};
exports.get = get;

/**
 * The http.head() method
 * 
 * @param {Object} options
 * @param {Function} cb
 */
var head = function (options, cb) {
	if (typeof options === 'string') {
		options = {url: options};
	}
	
	if ( ! options.url) {
		cb(tools.formattedError('The options object requires an input URL value.'));
		return;
	}
	
	var input = tools.processInput(options);
	var opt = input.opt;
	var client = input.client;
	var url = input.url;
	options = input.options;
	
	var processRequest = function (req) {
		req.on('response', function (res) {
			// workaround for the node.js v0.10 issue with Stream hanging the event loop
			res.resume();
			
			var err, ret;
			
			switch (res.statusCode) {
				case 200: // OK
				case 204: // No Content
				case 206: // Partial Content
				case 304: // Not Modified
					ret = {
						code: res.statusCode,
						headers: res.headers
					};
					
					if (options.reqId > 1) {
						ret.url = options.url;
					}
					
					cb(null, ret);
				break;
				
				case 300: // redirect requests, handled if they have a valid Location header
				case 301:
				case 302:
				case 303:
				case 305:
				case 307:
					if ( ! res.headers.location) {
						err = tools.formattedError('Redirect response without the Location header.');
						err.code = res.statusCode;
						err.headers = res.headers;
						err.url = options.url;
						cb(err);
					} else {
						options.url = tools.prepareRedirectUrl(url, res.headers.location);
						if (options.reqId < options.maxRedirects) {
							head(options, cb);
						} else {
							err = tools.formattedError('Redirect loop detected after %d requests.', options.reqId);
							err.code = res.statusCode;
							err.headers = res.headers;
							err.url = options.url;
							cb(err);
						}
					}
				break;
				
				default: // error status, the success statuses are in the above branches
					err = tools.formattedError('HTTP Error: %d', res.statusCode);
					err.code = res.statusCode;
					err.headers = res.headers;
					err.url = options.url;
					cb(err);
				break;
			}
		});
		
		req.on('error', function (err) {
			err.url = options.url;
			cb(err);
		});
		
		req.setTimeout(options.timeout, function () {
			var err = tools.formattedError('Timeout of %d miliseconds reached for HEAD %s.', options.timeout, options.url);
			err.url = options.url;
			cb(err);
			req.abort();
		});
		
		req.end();
	};
	
	processRequest(client.head(opt));
};
exports.head = head;

// exposes the parseUrl wrapper
// undocumented, therefore don't rely on it
exports.parseUrl = tools.parseUrl;
