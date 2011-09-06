var assert = require('assert');
var common = require('./includes/common.js');

var callback = [false, false];
var index = 0;

common.executeTests(function (err, res) {
		callback[index] = true;
		index++;
		assert.ok(err instanceof Error);
		assert.deepEqual(err.message, 'Large body detected.');
		assert.deepEqual(err.code, 200);
	},
	{
		maxbody: 2
});

process.on('exit', function () {
	for (var i in callback) {
		assert.ok(callback[i]);
	}
});
