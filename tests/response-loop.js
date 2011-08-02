var assert = require('assert');
var common = require('./includes/common.js');

var http = require('../');

var server = common.createLoopServer(function () {
	http.get({url: common.options.url}, function (err, res) {
		assert.ok(err instanceof Error);
		assert.deepEqual(err.message, 'Redirect loop detected after 10 requests.');
		assert.deepEqual(err.code, 301);
		server.close();
	});
});
