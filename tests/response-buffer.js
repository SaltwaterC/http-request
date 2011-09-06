var assert = require('assert');
var common = require('./includes/common.js');

var callback = [false, false];
var index = 0;

common.executeTests(function (err, res) {
	callback[index] = true;
	index++;
	assert.ifError(err);
	assert.deepEqual(res.code, 200);
	assert.deepEqual(res.headers['content-type'], 'text/plain');
	try {
		require('gzbz2');
		assert.deepEqual(res.headers['content-encoding'], 'gzip');
	} catch (e) {}
	assert.deepEqual(res.buffer, 'foo');
});

process.on('exit', function () {
	for (var i in callback) {
		assert.ok(callback[i]);
	}
});
