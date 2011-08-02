var http = require('../');

var assert = require('assert');

var assertions = function (err, res) {
	assert.ok(err instanceof Error);
	assert.deepEqual(err.message, 'The options object requires an input URL value.');
};

http.get({}, function (err, res) {
	assertions(err, res);
});

http.head({}, function (err, res) {
	assertions(err, res);
});
