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
		var err;
		
		buf.push(data);
		size += data.length;
		
		if (size > 1073741823) {
			err = new Error('Buffer too large. node.js limits the SlowBuffer implementation to 1073741823 bytes.');
		}
		
		if (request.options.maxBody) {
			if (size > request.options.maxBody) {
				err = new Error('Large body detected.');
			}
		}
		
		if (request.options.progress) {
			var total = result.response.headers['content-length'] | 0;
			request.options.progress(size, total);
		}
		
		if (err) {
			request.close();
			
			err.code = result.response.statusCode;
			err.headers = result.response.headers;
			err.url = request.options.url;
			
			cb(err);
		}
		
		// TODO: progress
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
