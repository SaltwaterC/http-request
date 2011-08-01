var http = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var fs = require('fs');
var p = require('path');

var server = common.createFooServerSecure(function () {
	var path = p.resolve('foo.txt');
	http.get({url: common.options.urlSecure}, path, function (err, res) {
		if (err) {
			throw err;
		}
		assert.deepEqual(res.code, 200);
		assert.deepEqual(res.headers['content-type'], 'text/plain');
		assert.deepEqual(res.file, path);
		server.close();
		fs.stat(res.file, function (err, stat) {
			if (err) {
				throw err;
			}
			fs.readFile(res.file, function (err, data) {
				if (err) {
					throw err;
				}
				assert.deepEqual(data.toString(), 'foo');
				fs.unlink(res.file, function (err) {
					if (err) {
						throw err;
					}
				});
			});
		});
	});
});
