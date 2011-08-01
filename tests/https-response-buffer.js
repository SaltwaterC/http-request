var http = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var u = require('url');

var server = common.createFooServerSecure(function () {
	var url = u.format({
		protocol: 'https:',
		hostname: common.options.host,
		port: common.options.port,
		path: '/'
	});
	http.get({url: url}, function (err, res) {
		if (err) {
			throw err;
		}
		assert.deepEqual(res.code, 200);
		assert.deepEqual(res.headers['content-type'], 'text/plain');
		assert.deepEqual(res.buffer, 'foo');
		server.close();
	});
});
