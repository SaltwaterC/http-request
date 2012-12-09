'use strict';

var hg = require('../../');

var u = require('url');
var fs = require('fs');
var p = require('path');
var zlib = require('zlib');
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
			key: "-----BEGIN RSA PRIVATE KEY-----\n\
MIICXAIBAAKBgQCqU3qR60Pgojh8HjO3+ttmgZVj6l5Ai0PHscCUq7q72vrgJVjz\n\
LqfOz2K182MxACwh5oYklqhSuL+7j+GvXRVCoq7Y2zE6P/PphEGhVwgS1fg034S4\n\
sgzuY01MzbBKfG1j5YOYMpAo0E4TcxF/iT69L3aRGyWP/xc9rG8rsypdTQIDAQAB\n\
AoGAaFjYIIk3fmkjnbaLDM2cmEIPGbU9pOEs1yxoxSwoLGpNhACda+5LVAHtgXbo\n\
b96hKuulhsjdukABBpFxPBQUr0w8oc67aY7ihkD0Hix/ug1oUj7rskumRmNMqrJz\n\
n+uPq0nnFEQqKsR3RavasLyaAR8CpPAQ6eW5EWIHY859GkECQQDVY9ezBjNMpMr+\n\
UeEiPQ/KKhsrAVqdz8YbFe0d+MitDaMjTo9t6JTXq+pWK/s7G1QD6l2NpruR8+Td\n\
uUb+UTm1AkEAzFZG9CGjwxew5WJcNmM+cEOtfrZKvPjbP7d06WFQDmXeW/Hxpz7M\n\
14dNut5FEln0IwsfyEVrckIfpSv3hET0OQJAGtA362PtEEVoyHorauz3TfTqgwXh\n\
iBDymLaxm+GF/dDH3gjiFvJxuYP9pyRRpkSx0ughJ0p7KUTXTlEYrZ4xPQJBAIkT\n\
9AOAsbiGIyCu7Id76n4rmK8hoV/GXmcPLnoF00vlYNczptZ4lbicxzNuOs4F1HbR\n\
1p9mmp8K5unKZgCwtVkCQBTu2Q57Pq6bMm0szuxU/+v5/6ECZyNLkW6fjOaro4TU\n\
0UN0N4vfzkQXx7zwB2b462/hDmMABS3ZaySuWW4bsyo=\n\
-----END RSA PRIVATE KEY-----",
			cert: "-----BEGIN CERTIFICATE-----\n\
MIIDAjCCAmugAwIBAgIJAK2xvkb3AFXoMA0GCSqGSIb3DQEBBQUAMHwxCzAJBgNV\n\
BAYTAlJPMRMwEQYDVQQIEwpTb21lLVN0YXRlMQ0wCwYDVQQKEwRIb21lMQ0wCwYD\n\
VQQLEwRIb21lMRUwEwYDVQQDFAzImHRlZmFuIFJ1c3UxIzAhBgkqhkiG9w0BCQEW\n\
FHNhbHR3YXRlcmNAZ21haWwuY29tMB4XDTEyMTIwODE2NDgyMVoXDTIyMTIwNjE2\n\
NDgyMVowgYwxCzAJBgNVBAYTAlJPMRMwEQYDVQQIEwpTb21lLVN0YXRlMQ4wDAYD\n\
VQQHEwVTaWJpdTENMAsGA1UEChMESG9tZTENMAsGA1UECxMESG9tZTEVMBMGA1UE\n\
AxMMaHR0cC1nZXQubGFuMSMwIQYJKoZIhvcNAQkBFhRzYWx0d2F0ZXJjQGdtYWls\n\
LmNvbTCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAqlN6ketD4KI4fB4zt/rb\n\
ZoGVY+peQItDx7HAlKu6u9r64CVY8y6nzs9itfNjMQAsIeaGJJaoUri/u4/hr10V\n\
QqKu2NsxOj/z6YRBoVcIEtX4NN+EuLIM7mNNTM2wSnxtY+WDmDKQKNBOE3MRf4k+\n\
vS92kRslj/8XPaxvK7MqXU0CAwEAAaN7MHkwCQYDVR0TBAIwADAsBglghkgBhvhC\n\
AQ0EHxYdT3BlblNTTCBHZW5lcmF0ZWQgQ2VydGlmaWNhdGUwHQYDVR0OBBYEFA+j\n\
xGmzi6nVe1sRU5u27nex2I2RMB8GA1UdIwQYMBaAFGFTKPE3pkVvsl4aI204q678\n\
CaXvMA0GCSqGSIb3DQEBBQUAA4GBACAjdDj9knTm1n+zJUPZIQWQEtG8/ZizuwO7\n\
pqovTsKrytNQdXjizJNbXL98vr956fcuCYCwwCX3M60amVhbRYa2XoHegJBZm/KS\n\
Nf1BxNjf/LEgc4yAn6XxRfwG3hqqyvhXeRhs6pehWxgAUje2TIKBfYkgyo1MMeBQ\n\
GzbWB96n\n\
-----END CERTIFICATE-----"
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
