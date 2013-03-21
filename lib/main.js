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
 * new Request(options) wrapper
 *
 * @param {Object} options The options Object taken by the {@link module:request~Request} constructor
 * @returns {Request} A new instance of the {@link module:request~Request} class
 */
exports.createHttpClient = function(options) {
    return new Request(options);
};

/**
 * HTTP GET method wrapper
 *
 * @param {Object} options The options Object taken by the {@link Request} constructor, filtered by {@link module:tools.shortHand}
 * @param {Function (error, stdResponse)} callback Completion callback
 *
 * @param {Error} callback.error The Error instance that bubbles up to the user code
 * @param {Object} callback.stdResponse A standard response object passed by {@link module:request~Request#stdResult}
 */
exports.get = function(options, file, callback) {
    if (!callback) {
        callback = file;
        file = false;
    }

    options = tools.shortHand(options, 'get');
    tools.checkCallback(callback);

    var request = new Request(options);

    request.send(function(err, res) {
        if (err) {
            callback(err);
        } else {
            if (options.stream === true) {
                callback(null, request.stdResult());
            } else {
                switch (file) {
                    case false:
                        // buffer
                        request.saveBuffer(function(err, buf) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, request.stdResult());
                            }
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

                        request.saveFile(file, function(err, res) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, request.stdResult());
                            }
                        });
                        break;
                }
            }
        }
    });
};

/**
 * HTTP HEAD method wrapper
 *
 * @param {Object} options The options Object taken by the {@link Request} constructor, filtered by {@link module:tools.shortHand}
 * @param {Function (error, stdResponse)} callback Completion callback
 *
 * @param {Error} callback.error The Error instance that bubbles up to the user code
 * @param {Object} callback.stdResponse A standard response object passed by {@link module:request~Request#stdResult}
 */
exports.head = function(options, callback) {
    options = tools.shortHand(options, 'head');
    tools.checkCallback(callback);

    var request = new Request(options);

    request.send(function(err, res) {
        if (err) {
            callback(err);
        } else {
            callback(null, request.stdResult());
            res.response.resume();
        }
    });
};
