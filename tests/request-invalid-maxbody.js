var hg = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var http = require('http');

var server = http.createServer(function (req, res) {
	res.writeHead(200);
	res.end();
});

server.listen(common.options.port, common.options.host, function () {
	hg.get({
		url: common.options.url,
		maxbody: 'foo'
	}, function (err, res) {
		assert.ok(err instanceof Error);
		assert.deepEqual(err.message, 'Invalid options.maxbody specification.');
		server.close();
	});
});
