var assert = require('assert');
var common = require('./includes/common.js');

var http = require('../');

var assertions = function (err, res) {
	assert.ok(err instanceof Error);
	assert.deepEqual(err.message, 'Parse Error');
};

http.get({url: '#foo.bar'}, function (err, res) {
	assertions(err, res);
});

http.head({url: '#foo.bar'}, function (err, res) {
	assertions(err, res);
});
