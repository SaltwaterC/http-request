// TODO DRY up the code
require('./object.watch.js');
/* core modules */
var fs = require('fs');
var u = require('url');
var p = require('path');
var http = require('http');
var https = require('https');
/* 3rd party optional module */
var gunzipstream;
try {
	gunzipstream = require('gzbz2/gunzipstream.js');
} catch (e) {}
/* reads the package.json information */
var pack = JSON.parse(fs.readFileSync(p.resolve(__dirname + '/../package.json')).toString('utf8'));
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
 * Makes all the HTTP request headers to be specified as lower case
 * @param hdr
 * @returns hdr
 */
var normalizeHeaders = function (hdr) {
	for (var name in hdr) {
		var lowName = name.toLowerCase();
		var val = hdr[name];
		delete(hdr[name]);
		hdr[lowName] = val;
	}
	return hdr;
};
/**
 * Returns the absolute integer value of the input. Avoids the NaN crap.
 * @param value
 * @returns value
 */
var absInt = function (value) {
	return Math.abs(parseInt(value) | 0);
};
/**
 * Processes the input parameters for get(), head()
 * @param options
 * @param reqId
 * @returns object
 */
var processInput = function (options, reqId) {
	if (reqId == undefined) {
		reqId = 0;
	}
	if (options.redirects) {
		options.redirects = absInt(options.redirects);
	}
	if ( ! options.redirects) {
		options.redirects = 10;
	}
	var url = options.url.trim(), client = http;
	if ( ! url.match(/^https?:\/\//i)) {
		// useful against "URLs" like www.example.com/foo.bar
		url = 'http://' + url;
	}
	if ( ! options.headers) {
		options.headers = {};
	}
	var opt = {
		headers: normalizeHeaders(options.headers)
	};
	if ( ! options.nogzip && gunzipstream) {
		opt.headers['accept-encoding'] = 'gzip';
	} else if (opt.headers['accept-encoding']) {
		delete(opt.headers['accept-encoding']);
	}
	if ( ! opt.headers['user-agent']) {
		opt.headers['user-agent'] = 'http-get/v' + pack.version + ' (https://github.com/SaltwaterC/http-get) ' + 'node.js/' + process.version;
	}
	if ( ! options.proxy) {
		url = u.parse(url);
		url.search = url.search || '';
		url.hash = url.hash || '';
		url.path = url.pathname + url.search + url.hash;
		if ( ! url.port) {
			if (url.protocol == 'https:') {
				url.port = 443;
			} else {
				url.port = 80;
			}
		}
		opt.host = url.hostname;
		opt.port = url.port;
		opt.path = url.path;
		if (url.protocol == 'https:') {
			client = https;
		}
		if (url.auth) {
			opt.headers.authorization = new Buffer(url.auth).toString('base64');
		}
	} else {
		opt.host = options.proxy.host;
		opt.port = options.proxy.port;
		opt.path = url;
		if (options.proxy.https) {
			client = https;
		}
	}
	return {
		options: options,
		opt: opt,
		reqId: reqId,
		client: client,
		url: url
	};
};
/**
 * Prepares the redirect target
 * @param url
 * @param location
 * @returns string
 */
var prepareRedirectUrl = function (url, location) {
	var original = u.parse(url);
	var location = u.parse(location);
	if ( ! location.protocol) {
		location.protocol = original.protocol;
	}
	if ( ! location.host) {
		location.host = original.host;
	}
	return u.format(location);
};
/**
 * Sets the http.Agent.defaultMaxSockets property
 * @param value
 */
var setMaxSockets = function (value) {
	value = absInt(value);
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
		cb = file;
		file = null;
		if (options.maxbody) {
			options.maxbody = absInt(options.maxbody);
			if ( ! options.maxbody) {
				cb(new Error('Invalid options.maxbody specification.'));
				return;
			}
		}
	} else {
		file = file.trim();
		file = p.resolve(file);
	}
	if ( ! options.url) {
		cb(new Error('The options object requires an input URL value.'));
		return;
	}
	var input = processInput(options, reqId);
	var opt = input.opt;
	var client = input.client;
	var url = input.url;
	options = input.options;
	reqId = input.reqId;
	var processRequest = function (req) {
		req.on('response', function (res) {
			switch (res.statusCode) {
				case 200: // success
					if (options.nogzip || ! gunzipstream) {
						if (res.headers['content-encoding'] == 'gzip') {
							var err = new Error('The server sent gzip content without being requested.');
							err.code = res.statusCode;
							err.headers = res.headers;
							cb(err);
							return;
						}
					}
					var aborted = false;
					var retry = true;
					res.on('close', function () {
						aborted = true;
						if ( ! options.nogzip) {
							if (retry) {
								// retry the request without gzip
								delete(options.headers['accept-encoding']);
								options.nogzip = true;
								if (file === null) {
									get(options, cb, reqId);
								} else {
									get(options, file, cb, reqId);
								}
							}
						} else {
							var err = new Error('The server prematurely closed the connection.');
							err.code = res.statusCode;
							err.headers = res.headers;
							cb(err);
						}
					});
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
									options.nogzip = true;
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
									options.nogzip = true;
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
										var err = new Error('Large body detected.');
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
											var err = new Error('Large body detected.');
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
						var err = new Error('Redirect response without location header.');
						err.code = res.statusCode;
						err.headers = res.headers;
						cb(err);
					} else {
						options.url = prepareRedirectUrl(url, res.headers.location);
						if (reqId < options.redirects) {
							reqId++;
							if ( ! file) {
								file = cb;
							}
							get(options, file, cb, reqId);
						} else {
							var err = new Error('Redirect loop detected after ' + Number(reqId) + ' requests.');
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
				default: // error
					var err = new Error('HTTP Error: ' + Number(res.statusCode));
					err.code = res.statusCode;
					err.headers = res.headers;
					cb(err);
				break;
			}
		});
		req.on('error', function (err) {
			cb(err);
		});
		if (req.setTimeout && typeof options.timeout === 'number') {
			req.setTimeout(options.timeout, function () {
				cb(new Error('Timeout while downloading ' + options.url));
				req.abort();
				return;
			});
		};
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
		cb(new Error('The options object requires an input URL value.'));
		return;
	}
	var input = processInput(options, reqId);
	var opt = input.opt;
	var client = input.client;
	var url = input.url;
	options = input.options;
	reqId = input.reqId;
	var processRequest = function (req) {
		req.on('response', function (res) {
			switch (res.statusCode) {
				case 200:
				case 304:
					var ret = {
						code: res.statusCode,
						headers: res.headers
					};
					if (reqId > 0) {
						ret.url = options.url;
					}
					cb(null, ret);
				break;
				case 300: // redirect
				case 301:
				case 302:
				case 303:
				case 305:
				case 307:
					if ( ! res.headers.location) {
						var err = new Error('Redirect response without location header.');
						err.code = res.statusCode;
						err.headers = res.headers;
						cb(err);
					} else {
						options.url = prepareRedirectUrl(url, res.headers.location);
						if (reqId < options.redirects) {
							reqId++;
							head(options, cb, reqId);
						} else {
							var err = new Error('Redirect loop detected after ' + Number(reqId) + ' requests.');
							err.code = res.statusCode;
							err.headers = res.headers;
							cb(err);
						}
					}
				break;
				default: // error
					var err = new Error('HTTP Error: ' + Number(res.statusCode));
					err.code = res.statusCode;
					err.headers = res.headers;
					cb(err);
				break;
			}
		});
		req.on('error', function (err) {
			cb(err);
		});
		if (req.setTimeout && typeof options.timeout === 'number') {
			req.setTimeout(options.timeout, function () {
				cb(new Error('Timeout while downloading ' + options.url));
				req.abort();
				return;
			});
		};
		req.end();
	};
	processRequest(client.head(opt));
};
exports.head = head;
