/* core modules */
var fs = require('fs');
var p = require('path');
var u = require('url');
var util = require('util');
var http = require('http');
var https = require('https');

/* 3rd party module */
var semver = require('semver');

/* reads the package.json information */
var pack = JSON.parse(fs.readFileSync(p.resolve(__dirname + '/../package.json')).toString('utf8'));

/**
 * Makes all the HTTP request headers to be specified as lower case
 * 
 * @param {Object} headers
 * @returns {Object}
 */
var normalizeHeaders = function (headers) {
	for (var name in headers) {
		var lowName = name.toLowerCase();
		var val = headers[name];
		delete(headers[name]);
		headers[lowName] = val;
	}
	return headers;
};
exports.normalizeHeaders = normalizeHeaders;

/**
 * Returns the absolute integer value of the input. Avoids the NaN crap.
 * 
 * @param value
 * @returns {Number} value
 */
var absInt = function (value) {
	return Math.abs(parseInt(value) | 0);
};

exports.absInt = absInt;
/**
 * Processes the input parameters for get(), head()
 *
 * @param {Object} options
 * @param {Number} reqId
 * @returns {Object}
 */
var processInput = function (options, reqId) {
	reqId = absInt(reqId);
	
	if (options.redirects) {
		options.redirects = absInt(options.redirects);
	}
	
	if ( ! options.redirects) {
		options.redirects = 10;
	}
	
	if (options.timeout) {
		options.timeout = absInt(options.timeout);
	}
	
	options.bufferType = options.bufferType || 'string';
	if (options.bufferType != 'string' && options.bufferType != 'buffer') {
		console.error('Warning: the passed bufferType is not valid. Expected: string or buffer. Falling back to string.');
		options.bufferType = 'string';
	}
	
	options.encoding = options.encoding || 'utf8';
	
	var url = String(options.url).trim(), client = http;
	if ( ! url.match(/^https?:\/\//i)) {
		url = 'http://' + url; // useful against "URLs" like www.example.com/foo.bar
	}
	
	if ( ! options.headers) {
		options.headers = {};
	}
	
	var opt = {
		headers: normalizeHeaders(options.headers)
	};
	
	// force options.nocompress for pre-v0.6.18 due to https://github.com/joyent/node/issues/3230
	if ( ! semver.satisfies(process.version, '>=0.6.18')) {
		options.nocompress = true;
	}
	
	if (options.nogzip) {
		options.nocompress = true;
		console.error('Warning: The nogzip option is deprecated in favor of nocompress.');
	}
	if ( ! options.nocompress) {
		opt.headers['accept-encoding'] = 'gzip, deflate';
	} else if (opt.headers['accept-encoding']) {
		delete(opt.headers['accept-encoding']);
	}
	
	if ( ! opt.headers['user-agent'] && ! options.noua) {
		opt.headers['user-agent'] = util.format('http-get/v%s (https://github.com/SaltwaterC/http-get) node.js/%s', pack.version, process.version);
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
		opt.auth = url.auth;
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
exports.processInput = processInput;

/**
 * Prepares the redirect target
 *
 * @param {String} url
 * @param {String} location
 * @returns {String}
 */
var prepareRedirectUrl = function (url, location) {
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
exports.prepareRedirectUrl = prepareRedirectUrl;

/**
 * Wrapper for formatting the message of an Error object
 * 
 * @param {String} message
 * @returns {Object}
 */
var formattedError = function () {
	return new Error(util.format.apply(this, arguments));
};
exports.formattedError = formattedError;

/**
 * Download progress callback
 * 
 * @param {Function} progress
 * @param {Buffer} data
 * @param {Number} currLen
 * @param {Number} totalLen
 * @returns {Number} currLen
 */
var doProgress = function (progress, data, currLen, totalLen) {
	if (progress && data && data.length) {
		currLen = currLen + data.length;
		progress(currLen, totalLen);
	}
	
	return currLen;
};
exports.doProgress = doProgress;

/**
 * Ends a file transfer
 * 
 * @param {Number} fd
 * @param {String} lastModified
 * @param {Object} writeStream
 */
var endFileTransfer = function (fd, lastModified, writeStream) {
	var atime = new Date();
	
	if (lastModified) {
		var mtime = new Date(lastModified);
	} else {
		var mtime = atime;
	}
	
	fs.futimes(fd, atime, mtime, function () {
		fs.fsync(fd, function () {
			writeStream.end();
		});
	});
};
exports.endFileTransfer = endFileTransfer;
