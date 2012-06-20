var http = require('../');

var assert = require('assert');
var common = require('./includes/common.js');

var callback = {
	direct: false,
	redirect: false
};

var server = common.createFooServer(false, function () {
	http.get({url: common.options.url}, null, function (err, res) {
		callback.direct = true;
		assert.ifError(err);
		assert.deepEqual(200, res.code);
		assert.ok(res.headers);
		http.get({url: common.options.urlRedirect}, null, function (err, res) {
			callback.redirect = true;
			assert.ifError(err);
			assert.deepEqual(200, res.code);
			assert.ok(res.headers);
			server.close();
		});
	});
});

process.on('exit', function () {
	for (var i in callback) {
		assert.ok(callback[i]);
	}
});
