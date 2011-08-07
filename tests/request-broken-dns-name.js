var http = require('../');

var assert = require('assert');

var assertions = function (err, res) {
	assert.ok(err instanceof Error);
	assert.equal(err.errno, 8);
	assert.deepEqual(err.code, 'EBADNAME');
};

http.head({url: 'http://.foo.bar/'}, function (err, res) {
	assertions(err, res);
});

http.head({url: 'https://.foo.bar/'}, function (err, res) {
	assertions(err, res);
});

http.get({url: 'http://.foo.bar/'}, function (err, res) {
	assertions(err, res);
});

http.get({url: 'https://.foo.bar/'}, function (err, res) {
	assertions(err, res);
});
