var http = require('../');

var assert = require('assert');

var assertions = function (err, res) {
	assert.ok(err instanceof Error);
	assert.equal(err.errno, 4);
	assert.deepEqual(err.code, 'ENOTFOUND');
};

http.get({url: 'http://foo.bar/'}, function (err, res) {
	assertions(err, res);
});

http.head({url: 'http://foo.bar/'}, function (err, res) {
	assertions(err, res);
});