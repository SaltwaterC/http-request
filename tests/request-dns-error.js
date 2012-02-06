var http = require('../');

var assert = require('assert');

var callbackGet = false;
var callbackHead = false;

var assertions = function (err, res) {
	assert.ok(err instanceof Error);
	assert.deepEqual(err.code, 'ENOTFOUND');
};

http.get({url: 'http://foo.bar/'}, function (err, res) {
	callbackGet = true;
	assertions(err, res);
});

http.head({url: 'http://foo.bar/'}, function (err, res) {
	callbackHead = true;
	assertions(err, res);
});

process.on('exit', function () {
	assert.ok(callbackGet);
	assert.ok(callbackHead);
});
