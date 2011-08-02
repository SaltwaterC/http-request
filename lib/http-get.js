/* core modules */
var fs = require('fs');
var u = require('url');
var p = require('path');
var http = require('http');
var https = require('https');
/* 3rd party modules */
var compressor = require('compressor');
/* reads the package.json information */
var pack = JSON.parse(fs.readFileSync(p.resolve(__dirname + '/../package.json')).toString('utf8'));

/**
 * Trims the whitespace at beginning / end of the string
 * @param string
 * @return string
 */ 
var trim = function (string) {
	string = string || '';
	return string.replace(/^\s*/, '').replace(/\s*$/, '');
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
	
	var url = trim(options.url), client = http;
	if ( ! url.match(/^[a-z]{4,5}:\/\//i)) {
		// useful against idiots submitting www.example.com/foo.bar
		// + idiots not doing proper validation
		url = 'http://' + url;
	}
	
	if ( ! options.headers) {
		options.headers = {};
	}
	var opt = {
		headers: normalizeHeaders(options.headers)
	};
	
	if ( ! options.nogzip) {
		opt.headers['accept-encoding'] = 'gzip';
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
 * The meat of this module
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
		file = trim(file);
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
	
	var req = client.get(opt, function (res) {
		switch (res.statusCode) {
			case 200: // success
				var aborted = false; // enough with the crappy race conditions
				
				if (file) {
					var ws = fs.createWriteStream(file);
					ws.on('error', function (err) {
						aborted = true;
						req.abort();
						cb(err);
					});
				} else {
					var buf = '';
				}
				
				var flushData = function (chunk) {
					if (file) {
						try {
							ws.write(chunk);
						} catch (e) {} // handled by the error listener
					} else {
						if ( ! aborted) {
							buf += chunk;
							if (options.maxbody) {
								if (buf.length > options.maxbody) {
									aborted = true;
									req.abort();
									var err = new Error('Large body detected.');
									err.code = 200;
									err.headers = res.headers;
									cb(err);
								}
							}
						}
					}
				};
				
				var endRequest = function () {
					var ret = {
						code: 200,
						headers: res.headers
					};
					if (file) {
						try {
							ws.end();
							ret.file = file;
						} catch (e) {} // handled by the error listener
					} else {
						if ( ! aborted) {
							ret.buffer = buf;
						}
					}
					if (reqId > 0) {
						ret.url = options.url;
					}
					if ( ! aborted) {
						cb(null, ret);
					}
				};
				
				if (res.headers['content-encoding'] == 'gzip') {
					var gunzip = new compressor.GunzipStream();
					var gzerr = false;
					
					gunzip.on('data', function (chunk) {
						if ( ! gzerr) {
							flushData(chunk);
						}
					});
					
					gunzip.on('end', function () {
						if ( ! gzerr) {
							endRequest();
						}
					});
					
					gunzip.on('error', function (err) {
						req.abort();
						gzerr = true;
						delete(options.headers['accept-encoding']);
						options.nogzip = true;
						if ( ! file) {
							file = cb;
						}
						get(options, file, cb, reqId);
					});
				}
				
				res.on('data', function (chunk) {
					if (gunzip) {
						chunk = gunzip.write(chunk);
					} else {
						flushData(chunk);
					}
				});
				
				res.on('end', function () {
					if (gunzip) {
						gunzip.close();
					} else {
						endRequest();
					}
				});
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
};
exports.get = get;

/**
 * The HEAD method for poking at the remote resources
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
	
	var req = client.get(opt, function (res) {
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
	
	req.end();
};
exports.head = head;
