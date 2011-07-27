var http = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var u = require('url');
var h = require('http');

var server = h.createServer(function (req, res) {
	res.writeHead(200, {'content-type': 'text/plain'});
	res.end('foo');
});

server.listen(common.port, common.host, function () {
	var url = u.format({
		protocol: 'http:',
		hostname: common.host,
		port: common.port,
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
