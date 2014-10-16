'use strict';

/* core module */
var util = require('util');
var qs = require('querystring');

/**
 * Checks if the letter is a vowel
 *
 * @private
 * @param {String} c The character to check
 */
var isVowel = function(c) {
	return ['a', 'e', 'i', 'o', 'u'].indexOf(c) !== -1;
};

/**
 * Creates the shorthand options object for specific HTTP method
 *
 * @private
 * @param {Mixed} options String | Object indicating the {@link module:request~options}. Passing a String (aka the shorthand options) is handled as `options = {url: options}`.
 * @param {String} method Indicates the HTTP method for the request
 * @returns {module:request~options} An options Object to be used by {@link module:request~Request}
 */
exports.shortHand = function(options, method) {
	if (typeof options === 'string') {
		return {
			url: options,
			method: method,
			headers: {}
		};
	}

	if (!options.hasOwnProperty('headers')) {
		options.headers = {};
	}

	options.method = method;
	return options;
};

/**
 * util.debug wrapper. Outputs only when NODE_ENV=development
 *
 * @private
 * @param {String} message The message which is dumped to STDERR via [util.debug](http://nodejs.org/api/util.html#util_util_debug_string) formatted by [util.format](http://nodejs.org/api/util.html#util_util_format_format)
 */
exports.debug = function() {
	if (process.env.NODE_ENV === 'development') {
		util.debug('http-request - ' + util.format.apply(this, arguments));
	}
};

/**
 * Wrapper for formatting the message of an Error object
 *
 * @private
 * @param {String} message The Error message
 * @returns {Error} The Error object with the message wrapped by [util.format](http://nodejs.org/api/util.html#util_util_format_format)
 */
exports.formattedError = function() {
	return new Error(util.format.apply(this, arguments));
};

/**
 * Check the type of a param
 *
 * @private
 * @param {Mixed} param The param which has the wrong type
 * @param {String} paramType The param expected type
 * @returns {Error} The TypeError object with the message wrapped by [util.format](http://nodejs.org/api/util.html#util_util_format_format)
 */
exports.checkType = function(name, param, paramType) {
	if (typeof param !== paramType) {
		var article = isVowel(paramType.charAt(0)) ? 'an' : 'a';
		throw new TypeError(util.format('Parameter \'%s\' must be %s %s, not %s', name, article, paramType, typeof param));
	}
};

/*jslint bitwise:true*/
/**
 * Makes sure the input is parsed as absolute integer or 0 on NaN
 *
 * @private
 * @param {Mixed} value Supposedly and integer value, but taken from user input
 * @returns {Number} Parsed integer or 0
 */
exports.absInt = function(value) {
	return Math.abs(parseInt(value, 10) | 0);
};
/*jslint bitwise:false*/

/**
 * Applies URL encoding to the input string. Unlike querystring.parse, it doesn't unescape on the parsing phase
 *
 * @private
 * @param {String} str
 * @returns {Object}
 */
exports.urlEncode = function(str) {
	var i, obj = {},
		key, value, idx, curr;

	str = str.split('&');
	var len = str.length;

	for (i = 0; i < len; i++) {
		curr = str[i];
		idx = curr.indexOf('=');

		if (idx >= 0) {
			key = curr.substr(0, idx);
			value = curr.substr(idx + 1);
		} else {
			key = curr;
			value = '';
		}

		if (!obj.hasOwnProperty(key)) {
			obj[key] = value;
		} else if (util.isArray(obj[key])) {
			obj[key].push(value);
		} else {
			obj[key] = [obj[key], value];
		}
	}

	return qs.stringify(obj);
};