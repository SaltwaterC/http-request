var http = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var server = common.createFooServer(function () {
	var opt = {
		url: common.options.url,
		headers: {
			foo: 'bar'
		}
	};
	http.get(opt, function (err, res) {
		if (err) {
			throw err;
		}
		assert.deepEqual(res.code, 200);
		assert.deepEqual(res.headers['content-type'], 'text/plain');
		assert.deepEqual(res.headers['foo'], opt.headers.foo);
		assert.deepEqual(res.buffer, 'foo');
		server.close();
	});
});
