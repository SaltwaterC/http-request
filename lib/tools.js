'use strict';

/* core module */
var util = require('util');

/**
 * Creates the shorthand options object for specific HTTP method
 *
 * @param options
 * @param {String} method
 * @returns {Object}
 */
exports.shortHand = function (options, method) {
	if (typeof options === 'string') {
		options = {
			url: options,
			method: method
		};
	} else {
		options.method = method;
	}
	
	return options;
};

/**
 * Checks the callback argument for proper type
 *
 * @param callback
 * @param {String} url
 */
exports.checkCallback = function (callback, url) {
	if (typeof callback !== 'function') {
		throw new Error(util.format('Expecting a function for the callback argument for URL: %s.', url));
	}
};

/**
 * Buffers the output of a HTTP stream
 *
 * @param {Stream} stream
 * @param {Function} cb
 */
exports.buffer = function (request, result, cb) {
	var buf = [], size = 0;
	
	result.stream.on('data', function (data) {
		buf.push(data);
		size += data.length;
		
		// TODO: maxBody, progress
	});
	
	result.stream.on('end', function () {
		if ( ! request.aborted()) {
			cb(null, Buffer.concat(buf, size));
		}
	});
	
	result.response.resume();
};

/**
 * util.debug wrapper. Outputs only when NODE_ENV=development
 *
 * @param {String} message
 */
exports.debug = function (message) {
	if (process.env.NODE_ENV === 'development') {
		util.debug('http-request - ' + String(message));
	}
};

/**
 * Wrapper for formatting the message of an Error object
 * 
 * @param {String} message
 * @returns {Object}
 */
exports.formattedError = function () {
	return new Error(util.format.apply(this, arguments));
};
