var hg = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var http = require('http');

var assertions = function (err, res) {
	assert.ok(err instanceof Error);
	assert.deepEqual(err.message, 'Redirect response without location header.');
	assert.deepEqual(err.code, 301);
};

var server = http.createServer(function (req, res) {
	res.writeHead(301);
	res.end();
});

server.listen(common.options.port, common.options.host, function () {
	hg.get({url: common.options.url}, function (err, res) {
		assertions(err, res);
		hg.head({url: common.options.url}, function (err, res) {
			assertions(err, res);
			server.close();
		});
	});
});
