'use strict';

/* internal module */
var config = require('../package.json');

/* core modules */
var fs = require('fs');
var p = require('path');
var u = require('url');
var util = require('util');
var http = require('http');
var https = require('https');

/* 3rd party module */
var semver = require('semver');

/**
 * Makes all the HTTP request headers to be specified as lower case
 * 
 * @param {Object} headers
 * @returns {Object}
 */
var normalizeHeaders = function (headers) {
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
exports.normalizeHeaders = normalizeHeaders;

/*jslint bitwise:true*/

/**
 * Returns the absolute integer value of the input. Avoids the NaN crap.
 * 
 * @param value
 * @returns {Number} value
 */
var absInt = function (value) {
	return Math.abs(parseInt(value, 10) | 0);
};
exports.absInt = absInt;

/*jslint bitwise:false*/

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
		options.maxRedirects = options.redirects;
		console.error('Warning: The redirects option is deprecated in favor of maxRedirects.');
		delete(options.redirects);
	}
	
	if (options.maxRedirects) {
		options.maxRedirects = absInt(options.maxRedirects);
	}
	
	if ( ! options.maxRedirects) {
		options.maxRedirects = 10;
	}
	
	if (options.timeout) {
		options.timeout = absInt(options.timeout);
	}
	
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
	
	// force options.noCompress for pre-v0.6.18 due to https://github.com/joyent/node/issues/3230
	if ( ! semver.satisfies(process.version, '>=0.6.18')) {
		options.noCompress = true;
	}
	
	if (options.nogzip) {
		options.noCompress = true;
		console.error('Warning: The nogzip option is deprecated in favor of noCompress.');
		delete(options.nogzip);
	}
	
	if (options.nocompress) {
		options.noCompress = true;
		console.error('Warning: The nocompress option is deprecated in favor of noCompress.');
		delete(options.nogzip);
	}
	
	if ( ! options.noCompress) {
		opt.headers['accept-encoding'] = 'gzip, deflate';
	} else if (opt.headers['accept-encoding']) {
		delete(opt.headers['accept-encoding']);
	}
	
	if (options.noua) {
		options.noUserAgent = options.noua;
		console.error('Warning: The noua option is deprecated in favor of noUserAgent.');
		delete(options.noua);
	}
	
	if ( ! opt.headers['user-agent'] && ! options.noUserAgent) {
		opt.headers['user-agent'] = util.format('http-get/v%s (https://github.com/SaltwaterC/http-get) node.js/%s', config.version, process.version);
	}
	
	if (options.maxbody !== undefined) {
		options.maxBody = options.maxbody;
		console.error('Warning: The maxbody option is deprecated in favor of maxBody.');
		delete(options.maxbody);
	}
	
	if ( ! options.proxy) {
		url = u.parse(url);
		url.search = url.search || '';
		url.hash = url.hash || '';
		url.path = url.pathname + url.search + url.hash;
		if ( ! url.port) {
			if (url.protocol === 'https:') {
				url.port = 443;
			} else {
				url.port = 80;
			}
		}
		opt.host = url.hostname;
		opt.port = url.port;
		opt.path = url.path;
		if (url.protocol === 'https:') {
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
	
	if (url.protocol === 'https:') {
		if (options.noSslVerifier !== true) {
			opt.rejectUnauthorized = true;
		}
		
		opt.ca = require('./ca-bundle.json');
		
		if ((options.ca instanceof Array) === true) {
			opt.ca = opt.ca.concat(options.ca);
		}
		
		opt.agent = new client.Agent(opt);
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
	var mtime;
	var atime = new Date();
	
	if (lastModified) {
		mtime = new Date(lastModified);
	} else {
		mtime = atime;
	}
	
	fs.futimes(fd, atime, mtime, function () {
		fs.fsync(fd, function () {
			writeStream.end();
		});
	});
};
exports.endFileTransfer = endFileTransfer;
