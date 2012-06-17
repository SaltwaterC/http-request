var http = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var callback = false;

var server = common.createFooServer(false, function () {
	http.get({url: common.options.url}, null, function (err, res) {
		callback = true;
		assert.ifError(err);
		assert.deepEqual(200, res.code);
		assert.ok(res.headers);
		server.close();
	});
});

process.on('exit', function () {
	assert.ok(callback);
});
