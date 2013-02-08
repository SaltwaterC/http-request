'use strict';

var u = require('url');
var zlib = require('zlib');
var util = require('util');
var assert = require('assert');
var semver = require('semver');

var options = {
	host: '127.0.0.1',
	port: 42890,
	securePort: 42891
};

options.urlNoPrefix = options.host + ':' + options.port + '/';

options.url = u.format({
	protocol: 'http:',
	hostname: options.host,
	port: options.port,
	pathname: '/'
});

options.secureUrl = u.format({
	protocol: 'https:',
	hostname: options.host,
	port: options.securePort,
	pathname: '/'
});

options.authUser = 'user@example.com';
options.authPass = 'pass word';

options.urlAuth = u.format({
	protocol: 'http:',
	hostname: options.host,
	port: options.port,
	pathname: '/auth',
	auth: options.authUser + ':' + options.authPass
});

options.secureServer = {
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
};

exports.options = options;

/**
 * The test teardown method
 * @param {Object} callbacks
 */
exports.teardown = function (callbacks) {
	assert.ok(callbacks instanceof Object);
	process.on('exit', function (code) {
		var i;
		for (i in callbacks) {
			if (callbacks.hasOwnProperty(i)) {
				assert.strictEqual(callbacks[i], 1);
				util.log(util.format('callback %s executed succesfully', i));
			}
		}
		util.log('exiting with code ' + code);
	});
};

/**
 * The looking for clients that send the Accept-Encoding header
 * @param {Object} headers
 */
exports.encoding = function (req, res) {
	if (req.headers['accept-encoding']) {
		var accept = req.headers['accept-encoding'].split(',');
		
		if (accept.indexOf('gzip') !== -1) {
			res.setHeader('content-encoding', 'gzip');
			return 'gzip';
		}
		
		if (accept.indexOf('deflate') !== -1) {
			res.setHeader('content-encoding', 'deflate');
			return 'deflate';
		}
	}
	
	return null;
};

/**
 * The common.response wrapper for the test server
 * @param {Object} res
 */
exports.response = function (req, res, content, type) {
	if ( ! content) {
		content = 'foo';
	}
	
	if ( ! type) {
		type = 'text/plain';
	}
	
	switch (exports.encoding(req, res)) {
		case 'gzip':
			util.log('common.response sending response for gzip');
			zlib.gzip(content, function (err, compressed) {
				if ( ! err) {
					res.writeHead(200, {'content-type': type});
					res.write(compressed);
				} else {
					res.writeHead(500, {'content-type': 'text/plain'});
				}
				res.end();
			});
		break;
		
		case 'deflate':
			util.log('common.response sending response for deflate');
			zlib.deflate(content, function (err, compressed) {
				if ( ! err) {
					res.writeHead(200, {'content-type': type});
					res.write(compressed);
				} else {
					res.writeHead(500, {'content-type': 'text/plain'});
				}
				res.end();
			});
		break;
		
		default:
			util.log('common.response sending response for plain');
			res.writeHead(200, {'content-type': type});
			res.end(content);
		break;
	}
};
