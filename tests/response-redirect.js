var hg = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var u = require('url');
var http = require('http');

var callbackGet1 = false;
var callbackGet2 = false;

var assertions = function (err, res, url) {
	assert.ifError(err);
	assert.deepEqual(res.code, 200);
	assert.deepEqual(res.url, url);
};

var server = http.createServer(function (req, res) {
	switch (req.url) {
		case '/foo':
			res.writeHead(200);
		break;
		
		default:
			res.writeHead(301, {location: '/foo'});
		break;
	}
	res.end();
});

server.listen(common.options.port, common.options.host, function () {
	var url = u.format({
		protocol: 'http:',
		hostname: common.options.host,
		port: common.options.port,
		pathname: '/foo'
	});
	hg.get({url: common.options.url}, function (err, res) {
		callbackGet1 = true;
		assertions(err, res, url);
		hg.get({url: common.options.url}, function (err, res) {
			callbackGet2 = true;
			assertions(err, res, url);
			server.close();
		});
	});
});

process.on('exit', function () {
	assert.ok(callbackGet1);
	assert.ok(callbackGet2);
});
