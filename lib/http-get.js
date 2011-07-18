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

var normalizeHeaders = function (hdr) {
	for (var name in hdr) { // normalize the headers to lower case
		var lowName = name.toLowerCase();
		var val = hdr[name];
		delete(hdr[name]);
		hdr[lowName] = val;
	}
	return hdr;
};

var pack = JSON.parse(fs.readFileSync(p.resolve(__dirname + '/../package.json')).toString('utf8'));

var get = function (options, file, cb, reqId) {
	if (typeof file == 'function') {
		cb = file;
		file = null;
	} else {
		file = trim(file);
		file = p.resolve(file);
	}
	
	if ( ! options.url) {
		cb(new Error('The options object requires an input url value.'), {});
		return;
	}
	
	if (reqId == undefined) {
		reqId = 0;
	}
	
	if (options.redirects) {
		options.redirects = Math.abs(parseInt(options.redirects) | 0);
	}
	
	if ( ! options.redirects) {
		options.redirects = 10;
	}
	
	var url = trim(options.url), client = http;
	if ( ! url.match(/^[a-z]{4,5}:\/\//i)) {
		url = 'http://' + url;
	}
	
	if ( ! options.headers) {
		options.headers = {};
	}
	var opt = {
		headers: normalizeHeaders(options.headers)
	};
	opt.headers['accept-encoding'] = 'gzip';
	if ( ! opt.headers['user-agent']) {
		opt.headers['user-agent'] = 'http-get/v' + pack.version + ' (https://github.com/SaltwaterC/http-get) ' + 'node.js/' + process.version;
	}
	
	if ( ! options.proxy) {
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
		
		opt.host = url.hostname;
		opt.port = url.port;
		opt.path = url.path;
		
		if (url.protocol == 'https:') {
			client = https;
		}
		
		if (url.auth) {
			opt.headers.authorization = new Buffer(url.auth).toString('base64');
		}
	} else {
		opt.host = options.proxy.host;
		opt.port = options.proxy.port;
		opt.path = url;
		
		if (options.proxy.https) {
			client = https;
		}
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
					var buf = '';
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
								cb(undefined, {code: 200, file: file, headers: res.headers});
							} catch (e) {} // handled by the error listener
						} else {
							cb(undefined, {code: 200, buffer: buf, headers: res.headers});
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
							buf += chunk;
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
								cb(undefined, {code: 200, file: file, headers: res.headers});
							} catch (e) {} // handled by the error listener
						} else {
							cb(undefined, {code: 200, buffer: buf, headers: res.headers});
						}
					}					
				});
			break;
			
			case 300: // redirect
			case 301:
			case 302:
			case 303:
			case 305:
			case 307:
				if ( ! res.headers.location) {
					var err = new Error('Redirect response without location header.');
					err.code = res.statusCode;
					cb(err, {});
				} else {
					var original = u.parse(url);
					var location = u.parse(res.headers.location);
					
					if ( ! location.protocol) {
						location.protocol = original.protocol;
					}
					
					if ( ! location.host) {
						location.host = original.host;
					}
					
					options.url = u.format(location);
					
					if (reqId < options.redirects) {
						reqId++;
						
						if ( ! file) {
							file = cb;
						}
						
						get(options, file, cb, reqId);
					} else {
						var err = new Error('Redirect loop detected after ' + reqId + ' requests.');
						err.code = res.statusCode;
						cb(err, {});
					}
				}
			break;
			
			case 304:
				cb(undefined, {code: 304, headers: res.headers});
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

exports.get = get;
