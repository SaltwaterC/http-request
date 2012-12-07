'use strict';

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

options.urlRange = u.format({
protocol: 'http:',
	hostname: options.host,
	port: options.port,
	pathname: '/range',
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
	var server;
	
	var srvCb = function (req, res) {
		var gzip = false;
		var deflate = false;
		
		if (req.headers.foo) {
			res.setHeader('foo', req.headers.foo);
		}
		
		if (req.headers['accept-encoding']) {
			var accept = req.headers['accept-encoding'].split(',');
			if (accept.indexOf('gzip') !== -1) {
				gzip = true;
				res.setHeader('content-encoding', 'gzip');
			} else if (accept.indexOf('deflate') !== -1) {
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
			
			case '/range':
				res.writeHead(206, {'content-type': 'text/plain', 'content-range': '0-1/3'});
				res.write('ba');
				res.end();
				return;
			
			case '/auth':
				res.writeHead(200, {'content-type': 'application/json'});
				
				// a pretty basic HTTP Basic Auth parser :)
				var authorization = req.headers.authorization || '';
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
		
		if (req.method !== 'HEAD') {
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
		server = https.createServer({
			key: '-----BEGIN RSA PRIVATE KEY-----\n\
MIICXAIBAAKBgQCvZg+myk7tW/BLin070Sy23xysNS/e9e5W+fYLmjYe1WW9BEWQ\n\
iDp2V7dpkGfNIuYFTLjwOdNQwEaiqbu5C1/4zk21BreIZY6SiyX8aB3kyDKlAA9w\n\
PvUYgoAD/HlEg9J3A2GHiL/z//xAwNmAs0vVr7k841SesMOlbZSe69DazwIDAQAB\n\
AoGAG+HLhyYN2emNj1Sah9G+m+tnsXBbBcRueOEPXdTL2abun1d4f3tIX9udymgs\n\
OA3eJuWFWJq4ntOR5vW4Y7gNL0p2k3oxdB+DWfwQAaUoV5tb9UQy6n7Q/+sJeTuM\n\
J8EGqkr4kEq+DAt2KzWry9V6MABpkedAOBW/9Yco3ilWLnECQQDlgbC5CM2hv8eG\n\
P0xJXb1tgEg//7hlIo9kx0sdkko1E4/1QEHe6VWMhfyDXsfb+b71aw0wL7bbiEEl\n\
RO994t/NAkEAw6Vjxk/4BpwWRo9c/HJ8Fr0os3nB7qwvFIvYckGSCl+sxv69pSlD\n\
P6g7M4b4swBfTR06vMYSGVjMcaIR9icxCwJAI6c7EfOpJjiJwXQx4K/cTpeAIdkT\n\
BzsQNaK0K5rfRlGMqpfZ48wxywvBh5MAz06D+NIxkUvIR2BqZmTII7FL/QJBAJ+w\n\
OwP++b7LYBMvqQIUn9wfgT0cwIIC4Fqw2nZHtt/ov6mc+0X3rAAlXEzuecgBIchb\n\
dznloZg2toh5dJep3YkCQAIY4EYUA1QRD8KWRJ2tz0LKb2BUriArTf1fglWBjv2z\n\
wdkSgf5QYY1Wz8M14rqgajU5fySN7nRDFz/wFRskcgY=\n\
-----END RSA PRIVATE KEY-----\n\
',
			cert: '-----BEGIN CERTIFICATE-----\n\
MIICRTCCAa4CCQDTefadG9Mw0TANBgkqhkiG9w0BAQUFADBmMQswCQYDVQQGEwJS\n\
TzEOMAwGA1UECBMFU2liaXUxDjAMBgNVBAcTBVNpYml1MSEwHwYDVQQKExhJbnRl\n\
cm5ldCBXaWRnaXRzIFB0eSBMdGQxFDASBgNVBAMTC1N0ZWZhbiBSdXN1MCAXDTEx\n\
MDgwMTE0MjU0N1oYDzIxMTEwNzA4MTQyNTQ3WjBmMQswCQYDVQQGEwJSTzEOMAwG\n\
A1UECBMFU2liaXUxDjAMBgNVBAcTBVNpYml1MSEwHwYDVQQKExhJbnRlcm5ldCBX\n\
aWRnaXRzIFB0eSBMdGQxFDASBgNVBAMTC1N0ZWZhbiBSdXN1MIGfMA0GCSqGSIb3\n\
DQEBAQUAA4GNADCBiQKBgQCvZg+myk7tW/BLin070Sy23xysNS/e9e5W+fYLmjYe\n\
1WW9BEWQiDp2V7dpkGfNIuYFTLjwOdNQwEaiqbu5C1/4zk21BreIZY6SiyX8aB3k\n\
yDKlAA9wPvUYgoAD/HlEg9J3A2GHiL/z//xAwNmAs0vVr7k841SesMOlbZSe69Da\n\
zwIDAQABMA0GCSqGSIb3DQEBBQUAA4GBACgdP59N5IvN3yCD7atszTBoeOoK5rEz\n\
5+X8hhcO+H1sEY2bTZK9SP8ctyuHD0Ft8X0vRO7tdt8Tmo6UFD6ysa/q3l0VVMVY\n\
abnKQzWbLt+MHkfPrEJmQfSe2XntEKgUJWrhRCwPomFkXb4LciLjjgYWQSI2G0ez\n\
BfxB907vgNqP\n\
-----END CERTIFICATE-----\n\
'
		}, srvCb);
		server.listen(options.securePort, options.host, cb);
		return server;
	}
	
	server = http.createServer(srvCb);
	server.listen(options.port, options.host, cb);
	return server;
};

exports.createFooServer = createFooServer;

var merge = function (obj1, obj2) {
	var attrname;
	var obj3 = {};
	
	for (attrname in obj1) {
		if (obj1.hasOwnProperty(attrname)) {
			obj3[attrname] = obj1[attrname];
		}
	}
	
	for (attrname in obj2) {
		if (obj2.hasOwnProperty(attrname)) {
			obj3[attrname] = obj2[attrname];
		}
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
	
	var i;
	var tests = [false, true];
	
	for (i in tests) {
		if (tests.hasOwnProperty(i)) {
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
	}
};

exports.executeTests = executeTests;
