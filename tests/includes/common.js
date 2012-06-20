var hg = require('../../');

var u = require('url');
var fs = require('fs');
var p = require('path');
var http = require('http');
var https = require('https');
var zlib = require('zlib');

var options = {
	host: '127.0.0.1',
	port: 42890,
	securePort: 42891
};

options.url = u.format({
	protocol: 'http:',
	hostname: options.host,
	port: options.port,
	pathname: '/'
});

options.urlRedirect = u.format({
	protocol: 'http:',
	hostname: options.host,
	port: options.port,
	pathname: '/redirect'
});

options.url404 = u.format({
	protocol: 'http:',
	hostname: options.host,
	port: options.port,
	pathname: '/404'
});

options.urlAuth = u.format({
	protocol: 'http:',
	hostname: options.host,
	port: options.port,
	pathname: '/auth',
	auth: 'user:pass'
});

options.urlNoPrefix = options.host + ':' + options.port + '/';

options.secureUrl = u.format({
	protocol: 'https:',
	hostname: options.host,
	port: options.securePort,
	pathname: '/'
});

exports.options = options;

var createFooServer = function (secure, cb) {
	var srvCb = function (req, res) {
		var gzip = false;
		var deflate = false;
		
		if (req.headers.foo) {
			res.setHeader('foo', req.headers.foo);
		}
		
		if (req.headers['accept-encoding']) {
			var accept = req.headers['accept-encoding'].split(',');
			if (accept.indexOf('gzip') != -1) {
				gzip = true;
				res.setHeader('content-encoding', 'gzip');
			} else if (accept.indexOf('deflate') != -1) {
				deflate = true;
			}
		}
		
		switch (req.url) {
			case '/404':
				res.writeHead(404, {'content-type': 'text/plain'});
				
				if ( ! gzip && ! deflate) {
					res.write('Not Found');
					res.end();
				} else {
					if (gzip) {
						zlib.gzip('Not Found', function (err, compressed) {
							if ( ! err) {
								res.write(compressed);
							} else {
								res.writeHead(500, {'content-type': 'text/plain'});
							}
							res.end();
						});
					}
					
					if (deflate) {
						zlib.deflate('Not Found', function (err, compressed) {
							if ( ! err) {
								res.write(compressed);
							} else {
								res.writeHead(500, {'content-type': 'text/plain'});
							}
							res.end();
						});
					}
				}
				return;
			break;
			
			case '/auth':
				res.writeHead(200, {'content-type': 'application/json'});
				
				// a pretti basic HTTP Basic Auth parser :)
				var authorization = req.headers['authorization'] || '';
				var token = authorization.split(/\s+/).pop() || '';
				var auth = new Buffer(token, 'base64').toString();
				auth = auth.split(/:/);
				
				var response = JSON.stringify({
					username: auth[0],
					password: auth[1]
				});
				
				if ( ! gzip && ! deflate) {
					res.write(response);
					res.end();
				} else {
					if (gzip) {
						zlib.gzip(response, function (err, compressed) {
							if ( ! err) {
								res.write(compressed);
							} else {
								res.writeHead(500, {'content-type': 'text/plain'});
							}
							res.end();
						});
					}
					
					if (deflate) {
						zlib.deflate(response, function (err, compressed) {
							if ( ! err) {
								res.write(compressed);
							} else {
								res.writeHead(500, {'content-type': 'text/plain'});
							}
							res.end();
						});
					}
				}
			break;
			
			case '/redirect':
				res.writeHead(302, {location: options.url});
			break;
			
			default:
				res.writeHead(200, {'content-type': 'text/plain'});
			break;
		}
		
		if (req.method != 'HEAD') {
			if ( ! gzip && ! deflate) {
				res.write('foo');
				res.end();
			} else {
				if (gzip) {
					zlib.gzip('foo', function (err, compressed) {
						if ( ! err) {
							res.write(compressed);
						} else {
							res.writeHead(500, {'content-type': 'text/plain'});
						}
						res.end();
					});
				}
				if (deflate) {
					zlib.deflate('foo', function (err, compressed) {
						if ( ! err) {
							res.write(compressed);
						} else {
							res.writeHead(500, {'content-type': 'text/plain'});
						}
						res.end();
					});
				}
			}
		} else {
			res.end();
		}
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
	for (var attrname in obj1) {
		obj3[attrname] = obj1[attrname];
	}
	for (var attrname in obj2) {
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
