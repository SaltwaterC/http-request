/* core modules */
var fs = require('fs');
var p = require('path');
var u = require('url');
var util = require('util');
var http = require('http');
var https = require('https');
/* reads the package.json information */
var pack = JSON.parse(fs.readFileSync(p.resolve(__dirname + '/../package.json')).toString('utf8'));
/**
 * Makes all the HTTP request headers to be specified as lower case
 * @param hdr
 * @return hdr
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
exports.normalizeHeaders = normalizeHeaders;
/**
 * Returns the absolute integer value of the input. Avoids the NaN crap.
 * @param value
 * @return value
 */
var absInt = function (value) {
	return Math.abs(parseInt(value) | 0);
};
exports.absInt = absInt;
/**
 * Processes the input parameters for get(), head()
 * @param options
 * @param reqId
 * @return object
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
	if (options.nogzip) {
		options.nocompress = true;
		console.error('Warning: The nogzip option is deprecated in favor of nocompress.');
	}
	if ( ! options.nocompress) {
		opt.headers['accept-encoding'] = 'gzip,deflate';
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
exports.processInput = processInput;
/**
 * Prepares the redirect target
 * @param url
 * @param location
 * @return string
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
exports.prepareRedirectUrl = prepareRedirectUrl;
