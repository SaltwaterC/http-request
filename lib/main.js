'use strict';

/**
 * @module main
 */

/* core module */
var util = require('util');

/* local modules */
var tools = require('./tools.js');
var Request = require('./request.js');

/**
 * Constructs a Request object for wrapping your own HTTP method / functionality
 *
 * @param {module:request~options} options The options Object taken by the {@link module:request~Request} constructor
 * @returns {module:request~Request} A new instance of the {@link module:request~Request} class
 */
exports.createHttpClient = function(options) {
	return new Request(options);
};

/**
 * HTTP GET method wrapper
 *
 * @param {module:request~options} options The options Object taken by the {@link Request} constructor, filtered by {@link module:tools.shortHand}. options.method = 'GET' and it can not be overridden
 * @param {module:main~callback} callback Completion callback
 */
exports.get = function(options, file, callback) {
	if (!callback) {
		callback = file;
		file = false;
	}

	options = tools.shortHand(options, 'get');
	var request = new Request(options);
	tools.checkCallback(callback, request.options.url);

	request.send(function(err, res) {
		if (err) {
			callback(err);
			return;
		}

		if (options.stream === true) {
			callback(null, request.stdResult());
			return;
		}

		switch (file) {
			case false:
				// buffer
				request.saveBuffer(function(err) {
					if (err) {
						callback(err);
						return;
					}

					callback(null, request.stdResult());
				});
				break;

			case null:
				// simulate writing to /dev/null, carefully under node.js v0.10
				callback(null, request.stdResult());
				res.response.resume();
				break;

			default:
				// save to file
				if (typeof file !== 'string') {
					throw tools.formatError('Expecting a file path for saving the object from URL: %s.', options.url);
				}

				request.saveFile(file, function(err) {
					if (err) {
						callback(err);
						return;
					}

					callback(null, request.stdResult());
				});
				break;
		}
	});
};

/**
 * HTTP HEAD method wrapper
 *
 * @param {module:request~options} options The options Object taken by the {@link Request} constructor, filtered by {@link module:tools.shortHand}. options.method = 'HEAD' and it can not be overridden
 * @param {module:main~callback} callback Completion callback
 */
exports.head = function(options, callback) {
	options = tools.shortHand(options, 'head');
	var request = new Request(options);
	tools.checkCallback(callback, request.options.url);

	request.send(function(err, res) {
		if (err) {
			callback(err);
			return;
		}

		callback(null, request.stdResult());
		res.response.resume();
	});
};

// documentation section

/**
 * Describes the callback passed to each HTTP method wrapper
 *
 * @callback module:main~callback
 * @param {module:request~stdError} error The standard error or *null* on success
 * @param {module:request~stdResult} result The standard result object if error is null
 */
