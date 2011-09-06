var http = require('../');

var assert = require('assert');

var callbackGet1 = false;
var callbackGet2 = false;
var callbackHead1 = false;
var callbackHead2 = false;

var assertions = function (err, res) {
	assert.ok(err instanceof Error);
	assert.equal(err.errno, 8);
	assert.deepEqual(err.code, 'EBADNAME');
};

http.get({url: 'http://.foo.bar/'}, function (err, res) {
	callbackGet1 = true;
	assertions(err, res);
});

http.get({url: 'https://.foo.bar/'}, function (err, res) {
	callbackGet2 = true;
	assertions(err, res);
});

http.head({url: 'http://.foo.bar/'}, function (err, res) {
	callbackHead1 = true;
	assertions(err, res);
});

http.head({url: 'https://.foo.bar/'}, function (err, res) {
	callbackHead2 = true;
	assertions(err, res);
});

process.on('exit', function () {
	assert.ok(callbackGet1);
	assert.ok(callbackGet2);
	assert.ok(callbackHead1);
	assert.ok(callbackHead2);
});
