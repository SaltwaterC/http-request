var assert = require('assert');
var common = require('./includes/common.js');

common.executeTests(function (err, res) {
		assert.ifError(err);
		assert.deepEqual(res.code, 200);
		assert.deepEqual(res.headers['content-type'], 'text/plain');
		try {
			require('gzbz2');
			assert.deepEqual(res.headers['content-encoding'], 'gzip');
		} catch (e) {}
		assert.deepEqual(res.headers['foo'], 'bar');
		assert.deepEqual(res.buffer, 'foo');
	},
	{
		headers: {
			foo: 'bar'
		}
});
