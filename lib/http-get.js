/* core modules */
var fs = require('fs');
var u = require('url');
var p = require('path');

/* 3rd pary modules */
var compressor = require('compressor');

/* backported core modules */
var http = require('backport-0.4').load('http');
var https = require('backport-0.4').load('https');

var trim = function (string) {
	return string.replace(/^\s*/, '').replace(/\s*$/, '');
};

exports.get = function (url, file, cb, reqId) {
	if (reqId == undefined) {
		reqId = 0;
	}
	
	if (typeof file == 'function') {
		cb = file;
		file = null;
	} else {
		file = trim(file);
		file = p.resolve(file);
	}
	
	// TODO: implement HTTP proxy support by passing an object as the url arg
	url = trim(url);
	if ( ! url.match(/^[a-z]{4,5}:\/\//i)) {
		url = 'http://' + url;
	}
	
	url = u.parse(url);
	url.search = url.search || '';
	url.hash = url.hash || '';
	url.path = url.pathname + url.search + url.hash;
	if ( ! url.port) {
		if (url.protocol == 'https:') {
			url.port = 443;
		} else {
			url.port = 80;
		}
	}
	
	var opt = {
		host: url.hostname,
		port: url.port,
		path: url.path,
		headers: {
			'accept-encoding': 'gzip'
		}
	};
	
	var client;
	if (url.protocol == 'https:') {
		client = https;
	} else {
		client = http;
	}
	
	var req = client.get(opt, function (res) {
		switch (res.statusCode) {
			case 200: // success
				if (file) {
					var ws = fs.createWriteStream(file);
					ws.on('error', function (err) {
						req.abort();
						cb(err, {});
					});
				} else {
					buf = '';
				}
				
				if (res.headers['content-encoding'] == 'gzip') {
					var gunzip = new compressor.GunzipStream();
					
					gunzip.on('data', function (chunk) {
						if (file) {
							try {
								ws.write(chunk);
							} catch (e) {} // handled by the error listener
						} else {
							buf += chunk;
						}
					});
					
					gunzip.on('end', function () {
						if (file) {
							try {
								ws.end();
								cb(undefined, file);
							} catch (e) {} // handled by the error listener
						} else {
							cb(undefined, buf);
						}
					});
					
					gunzip.on('error', function (err) {
						cb(err, {});
					});
				}
				
				res.on('data', function (chunk) {
					if (gunzip) {
						chunk = gunzip.write(chunk);
					} else {
						if (file) {
							try {
								ws.write(chunk);
							} catch (e) {} // handled by the error listener
						} else {
							// buf += chunk;
						}
					}
				});
				
				res.on('end', function () {
					if (gunzip) {
						gunzip.close();
					} else {
						if (file) {
							try {
								ws.end();
								cb(undefined, file);
							} catch (e) {} // handled by the error listener
						} else {
							cb(undefined, buf);
						}
					}					
				});
			break;
			
			case 301: // redirect
			case 302:
				// TODO: the redirect recursion till reqId reaches a limit
			break;
			
			default: // error
				var err = new Error('HTTP Error: ' + res.statusCode);
				err.code = res.statusCode;
				cb(err, {});
			break;
		}
	});
	
	req.on('error', function (err) {
		cb(err, {});
	});
};
