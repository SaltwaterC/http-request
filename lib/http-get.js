/* internal modules */
require('./Object.watch.js');
require('./Buffer.toByteArray.js');
var tools = require('./tools.js');
var fe = require('./FormattedError.js');

/* core modules */
var fs = require('fs');
var u = require('url');
var p = require('path');
var util = require('util');
var zlib = require('zlib');
var http = require('http');
var https = require('https');

/**
 * Patches in the http.head() method
 * @param options
 * @param cb
 * @return req
 */
http.head = function (options, cb) {
	options.method = 'HEAD';
	var req = http.request(options, cb);
	req.end();
	return req;
};

/**
 * Patches in the https.head() method
 * @param options
 * @param cb
 * @return req
 */
https.head = function (options, cb) {
	options.method = 'HEAD';
	var req = https.request(options, cb);
	req.end();
	return req;
};

/**
 * Sets the http.Agent.defaultMaxSockets property
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
 * @param options
 * @param file
 * @param cb
 * @param reqId
 */
var get = function (options, file, cb, reqId) {
	if (typeof file == 'function') {
		reqId = cb;
		cb = file;
		file = null;
		if (options.maxbody) {
			options.maxbody = tools.absInt(options.maxbody);
			if ( ! options.maxbody) {
				cb(fe('Invalid options.maxbody specification.'));
				return;
			}
		}
	} else {
		file = String(file).trim();
		file = p.resolve(file);
	}
	
	if ( ! options.url) {
		cb(fe('The options object requires an input URL value.'));
		return;
	}
	
	if (options.progress && ! (typeof options.progress) == 'function') {
		cb(fe('The progress option must be a callback function.'));
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
				case 200: // success
					if (options.progress) {
						// TODO: actually implement the progress around the new zlib support
						var totalLen = tools.absInt(res.headers['content-length']);
						var currLen = 0;
					}
					
					if (options.nocompress && res.headers['content-encoding']) {
						console.error('Warning: the server sent %s content without being requested for %s.', res.headers['content-encoding'], url);
					}
					
					var aborted = false;
					var retry = true;
					
					res.on('close', function () {
						aborted = true;
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
							var err = fe('The server prematurely closed the connection.');
							err.code = res.statusCode;
							err.headers = res.headers;
							cb(err);
						}
					});
					
					switch (res.headers['content-encoding']) {
						case 'gzip':
						case 'deflate':
							var stream = res.pipe(zlib.createUnzip());
						break;
						
						default: // no compression
							var stream = res;
						break;
					}
					
					if (file) { // saving to file
						
					} else { // buffered response
						
					}
					
					return; // XXX
					
					if (file) {
						var transfer = {ended: false};
						if (res.headers['content-encoding'] == 'gzip') {
							var ws = fs.createWriteStream(file);
							ws.on('error', function (err) {
								if ( ! aborted) {
									aborted = true;
									req.abort();
									cb(err);
								}
							});
							transfer.watch('ended', function () {
								transfer.unwatch('ended');
								ws.on('open', function (fd) {
									fs.fsync(fd, function () {
										ws.end();
									});
								});
							});
							ws.on('open', function (fd) {
								transfer.watch('ended', function () {
									transfer.unwatch('ended');
									fs.fsync(fd, function () {
										ws.end();
									});
								});
							});
							ws.on('close', function () {
								if ( ! aborted) {
									var ret = {
										code: 200,
										headers: res.headers,
										file: file
									};
									if (reqId > 0) {
										ret.url = options.url;
									}
									cb(null, ret);
								}
							});
							var gunzip = gunzipstream.wrap(res, {encoding: null});
							gunzip.on('error', function (err) {
								if ( ! aborted) {
									aborted = true;
									req.abort();
									delete(options.headers['accept-encoding']);
									options.nocompress = true;
									get(options, file, cb, reqId);
								}
							});
							gunzip.on('data', function (data) {
								try {
									ws.write(data);
								} catch (e) {} // handled by the error listener
							});
							gunzip.on('end', function () {
								transfer.ended = true;
							});
							gunzip.on('close', function () {
								transfer.ended = true;
							});
						} else { // no gzip response
							var ws = fs.createWriteStream(file);
							transfer.watch('ended', function () {
								transfer.unwatch('ended');
								ws.on('open', function (fd) {
									fs.fsync(fd, function () {
										ws.end();
									});
								});
							});
							ws.on('error', function (err) {
								aborted = true;
								req.abort();
								cb(err);
							});
							ws.on('open', function (fd) {
								transfer.watch('ended', function () {
									transfer.unwatch('ended');
									fs.fsync(fd, function () {
										ws.end();
									});
								});
							});
							ws.on('close', function () {
								if ( ! aborted) {
									var ret = {
										code: 200,
										headers: res.headers,
										file: file
									};
									if (reqId > 0) {
										ret.url = options.url;
									}
									cb(null, ret);
								}
							});
							res.on('data', function (data) {
								if ( ! aborted) {
									try {
										ws.write(data);
									} catch (e) {} // handled by the error listener
								}
							});
							res.on('end', function () {
								transfer.ended = true;
							});
						}
					} else { // buffered response
						var buf = '';
						if (res.headers['content-encoding'] == 'gzip') {
							var gunzip = gunzipstream.wrap(res, {encoding: null});
							gunzip.on('error', function (err) {
								if ( ! aborted) {
									aborted = true;
									req.abort();
									delete(options.headers['accept-encoding']);
									options.nocompress = true;
									get(options, cb, reqId);
								}
							});
							gunzip.on('data', function (data) {
								buf += data;
								if (options.maxbody) {
									if (buf.length > options.maxbody) {
										retry = false;
										aborted = true;
										req.abort();
										var err = fe('Large body detected.');
										err.code = 200;
										err.headers = res.headers;
										cb(err);
									}
								}
							});
							gunzip.on('end', function () {
								if ( ! aborted) {
									var ret = {
										code: 200,
										headers: res.headers,
										buffer: buf
									};
									if (reqId > 0) {
										ret.url = options.url;
									}
									cb(null, ret);
								}
							});
							gunzip.on('close', function () {
								if ( ! aborted) {
									var ret = {
										code: 200,
										headers: res.headers,
										buffer: buf
									};
									if (reqId > 0) {
										ret.url = options.url;
									}
									cb(null, ret);
								}
							});
						} else { // no gzip response
							res.on('data', function (data) {
								if ( ! aborted) {
									buf += data;
									if (options.maxbody) {
										if (buf.length > options.maxbody) {
											retry = false;
											aborted = true;
											req.abort();
											var err = fe('Large body detected.');
											err.code = 200;
											err.headers = res.headers;
											cb(err);
										}
									}
								}
							});
							res.on('end', function () {
								if ( ! aborted) {
									var ret = {
										code: 200,
										headers: res.headers,
										buffer: buf
									};
									if (reqId > 0) {
										ret.url = options.url;
									}
									cb(null, ret);
								}
							});
						}
					}
				break;
				
				case 300: // redirect
				case 301:
				case 302:
				case 303:
				case 305:
				case 307:
					if ( ! res.headers.location) {
						var err = fe('Redirect response without location header.');
						err.code = res.statusCode;
						err.headers = res.headers;
						cb(err);
					} else {
						options.url = tools.prepareRedirectUrl(url, res.headers.location);
						if (reqId < options.redirects) {
							if ( ! file) {
								file = cb;
							}
							get(options, file, cb, reqId);
						} else {
							var err = fe('Redirect loop detected after %d requests.', reqId);
							err.code = res.statusCode;
							err.headers = res.headers;
							cb(err);
						}
					}
				break;
				
				case 304:
					var ret = {
						code: 304,
						headers: res.headers
					};
					if (reqId > 0) {
						ret.url = options.url;
					}
					cb(null, ret);
				break;
				
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
					var err = fe('HTTP Error: %d', res.statusCode);
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
						break;
						
						default: // no compression
							var stream = res;
						break;
					}
					
					stream.on('data', function (data) {
						buf = buf.concat(data.toByteArray());
						if (fetchBody && buf.length > 1048576) {
							fetchBody = false;
							err.largeDocument = true;
							cb(err);
						}
					});
					
					stream.on('end', function () {
						if (fetchBody) {
							fetchBody = false;
							if (res.headers['content-length'] && res.headers['content-length'] > 0 && buf.length == 0) { // this is to detect decompression issues
								if (reqId == 1 && (res.headers['content-encoding'] == 'gzip' || res.headers['content-encoding'] == 'deflate')) {
									delete(options.headers['accept-encoding']);
									options.nocompress = true;
									if (file === null) {
										get(options, cb, reqId);
									} else {
										get(options, file, cb, reqId);
									}
								} else {
									err.noDocument = true;
									cb(err);
								}
							} else {
								err.document = new Buffer(buf);
								if (options.bufferType == 'string') {
									err.document = err.document.toString(options.encoding);
								}
								cb(err);
							}
						}
					});
					
					/* -- unfortunately, the zlib error reporting is broken
					stream.on('error', function (err) {
						
					});
					*/
				break;
				
				default: // error
					var err = fe('HTTP Error: %d', res.statusCode);
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
			cb(fe('Timeout of %d miliseconds reached while downloading %s.', options.timeout, options.url));
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
 * @param options
 * @param cb
 * @param reqId
 */
var head = function (options, cb, reqId) {
	if ( ! options.url) {
		cb(fe('The options object requires an input URL value.'));
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
						var err = fe('Redirect response without the Location header.');
						err.code = res.statusCode;
						err.headers = res.headers;
						cb(err);
					} else {
						options.url = tools.prepareRedirectUrl(url, res.headers.location);
						if (reqId < options.redirects) {
							head(options, cb, reqId);
						} else {
							var err = fe('Redirect loop detected after %d requests.', reqId);
							err.code = res.statusCode;
							err.headers = res.headers;
							cb(err);
						}
					}
				break;
				
				default: // error status, the success statuses are in the above branches
					var err = fe('HTTP Error: %d', res.statusCode);
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
			cb(fe('Timeout of %d miliseconds reached while sending the HEAD request to %s.', options.timeout, options.url));
			req.abort();
		});
		
		req.end();
	};
	
	processRequest(client.head(opt));
};
exports.head = head;
