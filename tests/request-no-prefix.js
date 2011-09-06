var hg = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var http = require('http');

var callback = false;

var server = common.createFooServer(false, function () {
	hg.get({
		url: common.options.urlNoPrefix,
	}, function (err, res) {
		callback = true;
		assert.ifError(err);
		assert.deepEqual(res.code, 200);
		assert.deepEqual(res.headers['content-type'], 'text/plain');
		try {
			require('gzbz2');
			assert.deepEqual(res.headers['content-encoding'], 'gzip');
		} catch (e) {}
		assert.deepEqual(res.buffer, 'foo');
		server.close();
	});
});

process.on('exit', function () {
	assert.ok(callback);
});
