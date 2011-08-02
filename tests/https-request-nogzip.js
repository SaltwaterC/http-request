var http = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var server = common.createFooServerSecure(function () {
	var opt = {
		url: common.options.urlSecure,
		nogzip: true
	};
	http.get(opt, function (err, res) {
		if (err) {
			throw err;
		}
		assert.deepEqual(res.code, 200);
		assert.deepEqual(res.headers['content-type'], 'text/plain');
		assert.deepEqual(res.buffer, 'foo');
		assert.notEqual(res.headers['content-encoding'], 'gzip');
		server.close();
	});
});
