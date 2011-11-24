var hg = require('../../');

var u = require('url');
var fs = require('fs');
var p = require('path');
var http = require('http');
var https = require('https');

var options = {
	host: '127.0.0.1',
	port: 42890,
	securePort: 42891
};

options.url = u.format({
	protocol: 'http:',
	hostname: options.host,
	port: options.port,
	path: '/'
});

options.urlNoPrefix = options.host + ':' + options.port + '/';

options.secureUrl = u.format({
	protocol: 'https:',
	hostname: options.host,
	port: options.securePort,
	path: '/'
});

options.gzipBuffer = new Buffer([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00,
					0x00, 0x03, 0x4b, 0xcb, 0xcf, 0x07, 0x00, 0x21, 0x65, 0x73, 0x8c,
					0x03, 0x00, 0x00, 0x00]);

exports.options = options;

var createFooServer = function (secure, cb) {
	var srvCb = function (req, res) {
		var gzip = false;
		if (req.headers.foo) {
			res.setHeader('foo', req.headers.foo);
		}
		if (req.headers['accept-encoding']) {
			var accept = req.headers['accept-encoding'].split(',');
			if (accept.indexOf('gzip') != -1) {
				gzip = true;
				res.setHeader('content-encoding', 'gzip');
			}
		}
		res.writeHead(200, {'content-type': 'text/plain'});
		
		if (req.method != 'HEAD') {
			if ( ! gzip) {
				res.write('foo');
			} else {
				res.write(options.gzipBuffer);
			}
		}
		
		res.end();
	};
	if (secure) {
		var server = https.createServer({
			key: fs.readFileSync(__dirname + '/server.key'),
			cert: fs.readFileSync(__dirname + '/server.cert')
		}, srvCb);
		server.listen(options.securePort, options.host, cb);
		return server;
	} else {
		var server = http.createServer(srvCb);
		server.listen(options.port, options.host, cb);
		return server;
	}
};

exports.createFooServer = createFooServer;

var merge = function (obj1, obj2) {
	var obj3 = {};
	for (attrname in obj1) {
		obj3[attrname] = obj1[attrname];
	}
	for (attrname in obj2) {
		obj3[attrname] = obj2[attrname];
	}
	return obj3;
};

var executeTests = function (assertions, testOptions, head, path) {
	var server = [];
	var serverListen = function (index, options) {
		process.nextTick(function () {
			process.nextTick(function () {
				if ( ! head) {
					if ( ! path) {
						hg.get(options, function (err, res) {
							assertions(err, res);
							server[index].close();
						});
					} else {
						path = p.resolve('foo' + index + '.txt');
						hg.get(options, path, function (err, res) {
							assertions(err, res);
							server[index].close();
						});
					}
				} else {
					hg.head(options, function (err, res) {
						assertions(err, res);
						server[index].close();
					});
				}
			});
		});
	};
	var tests = [false, true];
	for (var i in tests) {
		var opt = {};
		if (tests[i]) {
			opt.url = options.secureUrl;
		} else {
			opt.url = options.url;
		}
		if (testOptions) {
			opt = merge(opt, testOptions);
		}
		server[i] = createFooServer(tests[i], serverListen(i, opt));
	}
};

exports.executeTests = executeTests;
