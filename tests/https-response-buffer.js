var http = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var server = common.createFooServerSecure(function () {
	http.get({url: common.options.urlSecure}, function (err, res) {
		if (err) {
			throw err;
		}
		assert.deepEqual(res.code, 200);
		assert.deepEqual(res.headers['content-type'], 'text/plain');
		assert.deepEqual(res.buffer, 'foo');
		server.close();
	});
});
