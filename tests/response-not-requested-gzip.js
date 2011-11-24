var hg = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var http = require('http');

var callback = false;

var server = http.createServer(function (req, res) {
	res.setHeader('content-encoding', 'gzip');
	res.writeHead(200, {'content-type': 'text/plain'});
	res.write(common.options.gzipBuffer);
	res.end();
});

server.listen(common.options.port, common.options.host, function () {
	hg.get({
		url: common.options.url,
		nogzip: true
	}, function (err, res) {
		callback = true;
		assert.ok(err instanceof Error);
		assert.deepEqual(err.message, 'The server sent gzip content without being requested.');
		server.close();
	});
});

process.on('exit', function () {
	assert.ok(callback);
});
