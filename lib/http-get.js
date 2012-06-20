/* internal modules */
require('./Object.watch.js');
require('./Buffer.toByteArray.js');
var tools = require('./tools.js');

/* core modules */
var fs = require('fs');
var u = require('url');
var p = require('path');
var util = require('util');
var zlib = require('zlib');
var http = require('http');
var https = require('https');

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
 * @param {Number} reqId
 */
var get = function (options, file, cb, reqId) {
	if (typeof file == 'function') {
		cb = file;
		file = false;
		if (options.maxbody) {
			options.maxbody = tools.absInt(options.maxbody);
			if ( ! options.maxbody) {
				cb(tools.formattedError('Invalid options.maxbody specification.'));
				return;
			}
		}
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
	
	if (options.progress && ! (typeof options.progress) == 'function') {
		cb(tools.formattedError('The progress option must be a callback function.'));
		return;
	}
	
	var input = tools.processInput(options, reqId);
	var opt = input.opt;
	var client = input.client;
	var url = input.url;
	options = input.options;
	reqId = input.reqId;
	reqId++;
	
	var processRequest = function (req) {
		req.on('response', function (res) {
			switch (res.statusCode) {
				case 200: // OK
					if (options.progress) {
						var totalLen = tools.absInt(res.headers['content-length']);
						var currLen = 0;
					}
					
					if (options.nocompress && res.headers['content-encoding']) {
						if (semver.satisfies(process.version, '>=0.6.18')) {
							if (options.debug) {
								console.error('Warning: the server sent %s content without being requested for %s.', res.headers['content-encoding'], u.format(url));
							}
						} else {
							var err = tools.formattedError('The server sent %s content without being requested.', res.headers['content-encoding']);
							err.code = res.statusCode;
							err.headers = res.headers;
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
							
							if ( ! options.nocompress) {
								if (retry) {
									// retry the request without compression
									delete(options.headers['accept-encoding']);
									options.nocompress = true;
									if (file === null) {
										get(options, cb, reqId);
									} else {
										get(options, file, cb, reqId);
									}
								}
							} else {
								// TODO: Check if Content-Lenght is set, retry with a range request in order to continue the download
								var err = tools.formattedError('The server prematurely closed the connection.');
								err.code = res.statusCode;
								err.headers = res.headers;
								cb(err);
							}
						}
					});
					
					switch (res.headers['content-encoding']) {
						case 'gzip':
						case 'deflate':
							var unzip = zlib.createUnzip();
							var stream = res.pipe(unzip);
							
							// this works only in node.js v0.6.18+
							unzip.on('error', function (err) {
								if ( ! aborted) {
									aborted = true;
									req.abort();
									cb(err);
								}
							});
						break;
						
						default: // no compression
							var stream = res;
						break;
					}
					
					if (file) { // saving to file
						var ws = fs.createWriteStream(file);
						var transfer = {ended: false};
						
						// this machinery is here to make sure that when the callback is called
						// there won't be ENOENT errors for other code that expects this file to be on the disk
						// this bit is here for the situations where the Writable Stream open event is emitted after the transfer is finished
						transfer.watch('ended', function () {
							transfer.unwatch('ended');
							ws.on('open', function (fd) {
								tools.endFileTransfer(fd, res.headers['last-modified'], ws);
							});
						});
						
						// this machinery is here to make sure that when the callback is called
						// there won't be ENOENT errors for other code that expects this file to be on the disk
						ws.on('open', function (fd) {
							transfer.watch('ended', function () {
								transfer.unwatch('ended');
								tools.endFileTransfer(fd, res.headers['last-modified'], ws);
							});
						});
						
						ws.on('error', function (err) {
							aborted = true;
							req.abort();
							cb(err);
						});
						
						ws.on('close', function () {
							if ( ! aborted) {
								var ret = {
									code: res.statusCode,
									headers: res.headers,
									file: file
								};
								if (reqId > 0) {
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
							transfer.ended = true;
						});
					} else if (file === false) { // buffered response
						var buf = [];
						
						stream.on('data', function (data) {
							if ( ! aborted) {
								currLen = tools.doProgress(options.progress, data, currLen, totalLen);
								buf = buf.concat(data.toByteArray());
								if (options.maxbody) {
									if (buf.length > options.maxbody) {
										retry = false;
										aborted = true;
										req.abort();
										var err = tools.formattedError('Large body detected.');
										err.code = res.statusCode;
										err.headers = res.headers;
										cb(err);
									}
								}
							}
						});
						
						stream.on('end', function () {
							if ( ! aborted) {
								var ret = {
									code: res.statusCode,
									headers: res.headers,
									buffer: new Buffer(buf)
								};
								
								if (options.bufferType == 'string') {
									ret.buffer = ret.buffer.toString(options.encoding);
								}
								
								if (reqId > 0) {
									ret.url = options.url;
								}
								
								cb(null, ret);
							}
						});
					} else if (file === null) { // discard the response body, equivalent of sending the data to /dev/null
						var ret = {
							code: res.statusCode,
							headers: res.headers
						};
						if (reqId > 0) {
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
						var err = tools.formattedError('Redirect response without the Location header.');
						err.code = res.statusCode;
						err.headers = res.headers;
						cb(err);
					} else {
						options.url = tools.prepareRedirectUrl(url, res.headers.location);
						if (reqId < options.redirects) {
							if (file === false) {
								file = cb;
							}
							get(options, file, cb, reqId);
						} else {
							var err = tools.formattedError('Redirect loop detected after %d requests.', reqId);
							err.code = res.statusCode;
							err.headers = res.headers;
							cb(err);
						}
					}
				break;
				
				case 204: // No Content
				case 304: // Not Modified
					var ret = {
						code: res.statusCode,
						headers: res.headers
					};
					if (reqId > 0) {
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
					var err = tools.formattedError('HTTP Error: %d', res.statusCode);
					err.code = res.statusCode;
					err.headers = res.headers;
					err.document = '';
					err.largeDocument = false;
					err.noDocument = false;
					
					// can't trust the damn thing to avoid race conditions all by itself
					var fetchBody = true;
					
					// the collector buffer
					var buf = [];
					
					switch (res.headers['content-encoding']) {
						case 'gzip':
						case 'deflate':
							var unzip = zlib.createUnzip();
							var stream = res.pipe(unzip);
							
							// this works only in node.js v0.6.18+
							unzip.on('error', function (zerr) {
								if (fetchBody) {
									fetchBody = false;
									err.noDocument = true;
									err.message = zerr.message;
									cb(err);
								}
							});
						break;
						
						default: // no compression
							var stream = res;
						break;
					}
					
					stream.on('data', function (data) {
						if (fetchBody) {
							buf = buf.concat(data.toByteArray());
							if (fetchBody && buf.length > 1048576) {
								fetchBody = false;
								err.largeDocument = true;
								cb(err);
							}
						}
					});
					
					stream.on('end', function () {
						if (fetchBody) {
							fetchBody = false;
							err.document = new Buffer(buf);
							if (options.bufferType == 'string') {
								err.document = err.document.toString(options.encoding);
							}
							cb(err);
						}
					});
				break;
				
				default: // error
					var err = tools.formattedError('HTTP Error: %d', res.statusCode);
					err.code = res.statusCode;
					err.headers = res.headers;
					cb(err);
				break;
			}
		});
		
		req.on('error', function (err) {
			cb(err);
		});
		
		req.setTimeout(options.timeout, function () {
			cb(tools.formattedError('Timeout of %d miliseconds reached while downloading %s.', options.timeout, options.url));
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
 * @param {Number} reqId
 */
var head = function (options, cb, reqId) {
	if ( ! options.url) {
		cb(tools.formattedError('The options object requires an input URL value.'));
		return;
	}
	
	var input = tools.processInput(options, reqId);
	var opt = input.opt;
	var client = input.client;
	var url = input.url;
	options = input.options;
	reqId = input.reqId;
	reqId++;
	
	var processRequest = function (req) {
		req.on('response', function (res) {
			switch (res.statusCode) {
				case 200: // OK
				case 204: // No Content
				case 206: // Partial Content
				case 304: // Not Modified
					var ret = {
						code: res.statusCode,
						headers: res.headers
					};
					
					if (reqId > 0) {
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
						var err = tools.formattedError('Redirect response without the Location header.');
						err.code = res.statusCode;
						err.headers = res.headers;
						cb(err);
					} else {
						options.url = tools.prepareRedirectUrl(url, res.headers.location);
						if (reqId < options.redirects) {
							head(options, cb, reqId);
						} else {
							var err = tools.formattedError('Redirect loop detected after %d requests.', reqId);
							err.code = res.statusCode;
							err.headers = res.headers;
							cb(err);
						}
					}
				break;
				
				default: // error status, the success statuses are in the above branches
					var err = tools.formattedError('HTTP Error: %d', res.statusCode);
					err.code = res.statusCode;
					err.headers = res.headers;
					cb(err);
				break;
			}
		});
		
		req.on('error', function (err) {
			cb(err);
		});
		
		req.setTimeout(options.timeout, function () {
			cb(tools.formattedError('Timeout of %d miliseconds reached while sending the HEAD request to %s.', options.timeout, options.url));
			req.abort();
		});
		
		req.end();
	};
	
	processRequest(client.head(opt));
};
exports.head = head;
