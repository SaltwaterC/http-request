'use strict';

/**
 * @module main
 */

/* core modules */
var http = require('http');
var fs = require('fs');

var ReadStream = fs.ReadStream;
var IncomingMessage = http.IncomingMessage;

/* local modules */
var tools = require('./tools.js');
var Request = require('./request.js');

/* 3rd party modules */
exports.FormData = require('form-data');
var mmm = require('mmmagic');
var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

// private section

/**
 * Wrapper for all the responses having a body
 *
 * @private
 */
var requestWrapper = function(options, file, callback) {
	if (!callback) {
		callback = file;
		file = false;
	}

	var request = exports.createHttpClient(options);
	tools.checkType('callback', callback, 'function');

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
				request.saveBuffer(function(err, stdResult) {
					if (err) {
						callback(err);
						return;
					}

					callback(null, stdResult);
				});
				break;

			case null:
				// simulate writing to /dev/null, carefully under node.js v0.10
				callback(null, request.stdResult());
				res.response.resume();
				break;

			default:
				// save to file
				tools.checkType('file', file, 'string');

				request.saveFile(file, function(err, stdResult) {
					if (err) {
						callback(err);
						return;
					}

					callback(null, stdResult);
				});
				break;
		}
	});
};

// public section

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
 * @param {String|null} file Optional; specify a filesystem path to save the response body as file instead of Buffer. Passing null turns of the data listeners
 * @param {module:main~callback} callback Completion callback
 *
 * @example
// shorthand syntax, buffered response
http.get('http://localhost/get', function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers, res.buffer.toString());
});

// save the response to file with a progress callback
http.get({
	url: 'http://localhost/get',
	progress: function (current, total) {
		console.log('downloaded %d bytes from %d', current, total);
	}
}, 'get.bin', function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers, res.file);
});

// with explicit options, use a HTTP proxy, and limit the number of redirects
http.get({
	url: 'http://localhost/get',
	proxy: {
		host: 'localhost',
		port: 3128
	},
	maxRedirects: 2
}, function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers, res.buffer.toString());
});
 */
exports.get = function(options, file, callback) {
	options = tools.shortHand(options, 'get');
	requestWrapper(options, file, callback);
};

/**
 * HTTP HEAD method wrapper
 *
 * @param {module:request~options} options The options Object taken by the {@link Request} constructor, filtered by {@link module:tools.shortHand}. options.method = 'HEAD' and it can not be overridden
 * @param {module:main~callback} callback Completion callback
 *
 * @example
// shorthand syntax, default options
http.head('http://localhost/head', function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers);
});
 */
exports.head = function(options, callback) {
	options = tools.shortHand(options, 'head');
	var request = exports.createHttpClient(options);
	tools.checkType('callback', callback, 'function');

	request.send(function(err, res) {
		if (err) {
			callback(err);
			return;
		}

		callback(null, request.stdResult());
		res.response.resume();
	});
};

/**
 * HTTP DELETE method wrapper
 *
 * @param {module:request~options} options The options Object taken by the {@link Request} constructor, filtered by {@link module:tools.shortHand}. options.method = 'DELETE' and it can not be overridden
 * @param {String|null} file Optional; specify a filesystem path to save the response body as file instead of Buffer. Passing null turns of the data listeners
 * @param {module:main~callback} callback Completion callback
 *
 * @example
// shorthand syntax, buffered response
http.delete('http://localhost/delete', function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers, res.buffer.toString());
});

// with explicit options object, save to file the response body
http.delete({
	url: 'http://localhost/delete'
}, function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers, res.file);
});
 */
exports.delete = function(options, file, callback) {
	options = tools.shortHand(options, 'delete');
	requestWrapper(options, file, callback);
};

/**
 * HTTP POST method wrapper
 *
 * @param {module:request~options} options The options Object taken by the {@link Request} constructor, filtered by {@link module:tools.shortHand}. options.method = 'POST' and it can not be overridden
 * @param {String|null} file Optional; specify a filesystem path to save the response body as file instead of Buffer. Passing null turns of the data listeners
 * @param {module:main~callback} callback Completion callback
 *
 * @example
// shorthand syntax, buffered response, content-type = application/x-www-form-urlencoded
// param1=value1&amp;param2=value2 are stripped from the URL and sent via the request body

// do not pass the query values by using URL encoding
// the URL encoding is done automatically
http.post('http://localhost/post?param1=value1&amp;param2=value2', function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers, res.buffer.toString());
});

// explicit POST request, saves the response body to file

// for Buffer reqBody, the content-lenght header is reqBody.lenght
var reqBody = {
	param1: 'value1',
	param2: 'value2'
};

// this serialization also does URL encoding so you won't have to
reqBody = querystring.stringify(reqBody);

http.post({
	url: 'http://localhost/post',
	reqBody: new Buffer(reqBody),
	headers: {
		// specify how to handle the request, http-request makes no assumptions
		'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
	}
}, 'post.bin', function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers, res.file);
});

// multipart/form-data request built with form-data (3rd party module)
// you have to use the http export of FormData
// the instanceof operator fails otherwise
// implementing a manual check is not very elegant
var form = new http.FormData();

form.append('param1', 'value1');
form.append('param2', 'value2');

http.post({
	url: 'http://localhost/post',
	reqBody: form
}, function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers, res.buffer.toString());
});
 */
exports.post = function(options, file, callback) {
	var reqBody;
	options = tools.shortHand(options, 'post');

	// shorthand POST request
	if (!options.reqBody && options.url.indexOf('?') !== -1) {
		reqBody = options.url.split('?');
		options.url = reqBody[0];

		reqBody = tools.urlEncode(reqBody[1]);
		options.reqBody = new Buffer(reqBody);
		options.headers['content-type'] = 'application/x-www-form-urlencoded;charset=utf-8';
	}

	if (options.reqBody instanceof exports.FormData) {
		options.reqBody.getLength(function(err, length) {
			if (err) {
				callback(err);
				return;
			}

			options.headers['content-length'] = length;
			options.headers = options.reqBody.getHeaders(options.headers);

			requestWrapper(options, file, callback);
		});
		return;
	}

	requestWrapper(options, file, callback);
};

/**
 * HTTP PUT method wrapper
 *
 * @param {module:request~options} options The options Object taken by the {@link Request} constructor, filtered by {@link module:tools.shortHand}. options.method = 'PUT' and it can not be overridden
 * @param {String|null} file Optional; specify a filesystem path to save the response body as file instead of Buffer. Passing null turns of the data listeners
 * @param {module:main~callback} callback Completion callback
 *
 * @example
// put a buffer
http.put({
	url: 'http://localhost/put',
	reqBody: new Buffer('data to put'),
	headers: {
		// if you don't define a type, then mmmagic does it for you
		'content-type': 'text/plain'
	}
}, function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers, res.buffer.toString());
});

// put a ReadStream created with fs.createReadStream
// http-request knows how to handle a ReadStream
// content-length is taken from the file itself by making a fs.stat call
// content-type is detected automatically by using mmmagic if unspecified
http.put({
	url: 'http://localhost/put',
	reqBody: fs.createReadStream('/path/to/file')
}, function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers);
});

// pipe a HTTP response (a http.IncomingMessage Object) to a PUT request
// http-request knows how to handle an IncomingMessage
// content-lenght is taken from the response if exists
require('http').get('http://example.org/file.ext', function (im) {
	http.put({
		url: 'http://localhost/put',
		reqBody: im,
		headers: {
			// if you don't define content-type
			// it is taken from the response if exists
			'content-type': 'application/octet-stream'
		}
	}, function (err, res) {
		if (err) {
			console.error(err);
			return;
		}
		
		console.log(res.code, res.headers);
	});
});

// put a readable stream with known size and type, save the response body to file
http.put({
	url: 'http://localhost/put',
	reqBody: readableStream,
	headers: {
		'content-lenght': 1337,
		'content-type': 'text/plain'
	}
}, 'put.bin', function (err, res) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(res.code, res.headers, res.buffer.toString());
});
 */
exports.put = function(options, file, callback) {
	options = tools.shortHand(options, 'put');

	if (!options.headers['content-type'] && options.reqBody instanceof Buffer) {
		magic.detect(options.reqBody, function(err, mime) {
			if (err) {
				callback(err);
				return;
			}

			options.headers['content-type'] = mime;
			requestWrapper(options, file, callback);
		});
		return;
	}

	if (options.reqBody instanceof ReadStream) {
		options.reqBody.pause();

		fs.stat(options.reqBody.path, function(err, stats) {
			if (err) {
				callback(err);
				return;
			}

			options.headers['content-length'] = stats.size;

			if (!options.headers['content-type']) {
				magic.detectFile(options.reqBody.path, function(err, mime) {
					if (err) {
						callback(err);
						return;
					}

					options.headers['content-type'] = mime;
					requestWrapper(options, file, callback);
				});
				return;
			}

			requestWrapper(options, file, callback);
		});
		return;
	}

	if (options.reqBody instanceof IncomingMessage) {
		if (options.reqBody.headers['content-length']) {
			options.headers['content-length'] = options.reqBody.headers['content-length'];
		}

		if (!options.headers['content-type'] && options.reqBody.headers['content-type']) {
			options.headers['content-type'] = options.reqBody.headers['content-type'];
		}
	}

	requestWrapper(options, file, callback);
};

/**
 * Reads the first chunk from the target URL. Tries to pass back the proper MIME type
 *
 * @param {String} url The target URL
 * @param {Function} callback Completion callback with either {@link module:request~stdError} or the MIME type as string
 *
 * @example
http.mimeSniff('http://localhost/foo.pdf', function (err, mime) {
	if (err) {
		console.error(err);
		return;
	}
	
	console.log(mime); // application/pdf
});
 */
exports.mimeSniff = function(url, callback) {
	var request = exports.createHttpClient({
		url: url,
		method: 'GET',
		stream: true,
		noCompress: true
	});

	request.send(function(err, res) {
		if (err) {
			callback(err);
			return;
		}

		if (!res.stream) {
			request.error(new Error('Failed to retrieve the HTTP stream.'), callback);
			return;
		}

		if (res.stream.headers['content-length'] === '0') {
			request.error(new Error('The target URL has Content-Length: 0.'), callback);
			return;
		}

		res.stream.resume();
		res.stream.on('data', function(chunk) {
			request.request.abort();

			magic.detect(chunk, function(err, mime) {
				if (err) {
					request.error(err, callback);
					return;
				}

				callback(null, mime);
			});
		});
	});
};

/**
 * Sets the http.Agent.defaultMaxSockets value
 *
 * @param {Number} value
 *
 * @example
// use up to 128 concurrent sockets
http.setMaxSockets(128);
 */
exports.setMaxSockets = function(value) {
	value = tools.absInt(value);
	if (!value) { // fallback to the default
		value = 5;
	}
	http.Agent.defaultMaxSockets = value;
};

// documentation section

/**
 * Describes the callback passed to each HTTP method wrapper
 *
 * @callback module:main~callback
 * @param {module:request~stdError} error The standard error or *null* on success
 * @param {module:request~stdResult} result The standard result object if error is null
 */