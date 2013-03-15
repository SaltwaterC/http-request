'use strict';

/* core module */
var util = require('util');

/* local modules */
var tools = require('./tools.js');
var Request = require('./request.js');

/**
 * HTTP HEAD method wrapper
 *
 * @param {Object} options
 * @param {Function} callback
 */

exports.head = function (options, callback) {
	options = tools.shortHand(options, 'head');
	tools.checkCallback(callback);
	
	var request = new Request(options);
	
	request.send(function (err, res) {
		if (err) {
			callback(err);
		} else {
			callback(null, {
				code: res.response.statusCode,
				headers: res.response.headers,
				url: res.url
			});
			
			res.response.resume();
		}
	});
};

/**
 * HTTP GET method wrapper
 *
 * @param {Object} options
 * @param {Function} callback
 */
exports.get = function (options, file, callback) {
	if ( ! callback) {
		callback = file;
		file = false;
	}
	
	options = tools.shortHand(options, 'get');
	tools.checkCallback(callback);
	
	var request = new Request(options);
	
	request.send(function (err, res) {
		if (err) {
			callback(err);
		} else {
			switch (file) {
				case false: // buffer
					tools.buffer(request, res, function (err, buf) {
						if (err) {
							callback(err);
						} else {
							callback(null, {
								code: res.response.statusCode,
								headers: res.response.headers,
								buffer: buf,
								url: res.url
							});
						}
					});
				break;
				
				case null: // simulate writing to /dev/null, carefully under node.js v0.10
					callback(null, {
						code: res.response.statusCode,
						headers: res.response.headers,
						url: res.url
					});
					
					res.response.resume();
				break;
				
				default: // save to file
					if (typeof file !== 'string') {
						throw new Error(util.format('Expecting a file path for saving the object from URL: %s.', options.url));
					}
					
					// TODO
					throw new Error('TO IMPLEMENT: save to file');
			}
		}
	});
};

/**
 * Exposes the core wrapper to the user code
 *
 * @param {Object} options
 */
exports.createHttpClient = function (options) {
	return new Request(options);
};
