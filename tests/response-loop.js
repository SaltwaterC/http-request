var hg = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var http = require('http');

var server = http.createServer(function (req, res) {
	res.writeHead(301, {location: '/'});
	res.end();
});

server.listen(common.options.port, common.options.host, function () {
	hg.get({url: common.options.url}, function (err, res) {
		assert.ok(err instanceof Error);
		assert.deepEqual(err.message, 'Redirect loop detected after 10 requests.');
		assert.deepEqual(err.code, 301);
		hg.head({url: common.options.url}, function (err, res) {
			assert.ok(err instanceof Error);
			assert.deepEqual(err.message, 'Redirect loop detected after 10 requests.');
			assert.deepEqual(err.code, 301);
			server.close();
		});
	});
});
