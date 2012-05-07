/**
 * Error wrapper for displaying formatted error messages with less boilerplate
 * 
 * Instead of writing new Error(util.format('foo is %s while bar is %d', foo, bar));
 * It is easier to write FormattedError('foo is %s while bar is %d', foo, bar);
 */
var util = require('util');

module.exports = function () {
	return new Error(util.format.apply(this, arguments));
};
