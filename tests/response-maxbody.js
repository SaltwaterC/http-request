var assert = require('assert');
var common = require('./includes/common.js');

common.executeTests(function (err, res) {
		assert.ok(err instanceof Error);
		assert.deepEqual(err.message, 'Large body detected.');
		assert.deepEqual(err.code, 200);
	},
	{
		maxbody: 2
});
