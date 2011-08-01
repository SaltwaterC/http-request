var http = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var server = common.createFooServer(function () {
	http.head({url: common.options.url}, function (err, res) {
		if (err) {
			throw err;
		}
		assert.deepEqual(res.code, 200);
		assert.deepEqual(res.headers['content-type'], 'text/plain');
		server.close();
	});
});
