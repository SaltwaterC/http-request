var http = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var u = require('url');

var server = common.createFooServer(function () {
	var url = u.format({
		protocol: 'http:',
		hostname: common.options.host,
		port: common.options.port,
		path: '/'
	});
	http.head({url: url}, function (err, res) {
		if (err) {
			throw err;
		}
		assert.deepEqual(res.code, 200);
		assert.deepEqual(res.headers['content-type'], 'text/plain');
		server.close();
	});
});
