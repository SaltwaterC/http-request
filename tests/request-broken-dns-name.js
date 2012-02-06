var http = require('../');

var assert = require('assert');

var callbackGet1 = false;
var callbackGet2 = false;
var callbackHead1 = false;
var callbackHead2 = false;

http.get({url: 'http://.foo.bar/'}, function (err, res) {
	callbackGet1 = true;
	assert.ok(err instanceof Error);
});

http.get({url: 'https://.foo.bar/'}, function (err, res) {
	callbackGet2 = true;
	assert.ok(err instanceof Error);
});

http.head({url: 'http://.foo.bar/'}, function (err, res) {
	callbackHead1 = true;
	assert.ok(err instanceof Error);
});

http.head({url: 'https://.foo.bar/'}, function (err, res) {
	callbackHead2 = true;
	assert.ok(err instanceof Error);
});

process.on('exit', function () {
	assert.ok(callbackGet1);
	assert.ok(callbackGet2);
	assert.ok(callbackHead1);
	assert.ok(callbackHead2);
});
