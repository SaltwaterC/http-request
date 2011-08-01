var u = require('url');
var fs = require('fs');
var p = require('path');
var http = require('http');
var https = require('https');

var options = {
	host: '127.0.0.1',
	port: 42890
};

options.url = u.format({
	protocol: 'http:',
	hostname: options.host,
	port: options.port,
	path: '/'
});

options.urlSecure = u.format({
	protocol: 'https:',
	hostname: options.host,
	port: options.port,
	path: '/'
});

exports.options = options;

exports.createFooServer = function (cb) {
	var server = http.createServer(function (req, res) {
		res.writeHead(200, {'content-type': 'text/plain'});
		res.end('foo');
	});
	server.listen(options.port, options.host, cb);
	return server;
};

exports.createFooServerSecure = function (cb) {
	var opt = {
		key: fs.readFileSync(__dirname + '/server.key'),
		cert: fs.readFileSync(__dirname + '/server.cert')
	};
	var server = https.createServer(opt, function (req, res) {
		res.writeHead(200, {'content-type': 'text/plain'});
		res.end('foo');
	});
	server.listen(options.port, options.host, cb);
	return server;
};
