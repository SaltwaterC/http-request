'use strict';

var http = require('../');

var util = require('util');
var assert = require('assert');

var common = require('./includes/common.js');

var callback = {
	direct: false,
	redirect: false
};

var server = common.createFooServer(false, function () {
	util.log('sending the request');
	http.get({url: common.options.url}, null, function (err, res) {
		util.log('recieving the response');
		callback.direct = true;
		assert.ifError(err);
		assert.deepEqual(200, res.code);
		assert.ok(res.headers);
		util.log('sending the second request');
		http.get({url: common.options.urlRedirect}, null, function (err, res) {
			util.log('recieving the second response');
			callback.redirect = true;
			assert.ifError(err);
			assert.deepEqual(200, res.code);
			assert.ok(res.headers);
			util.log('closing the foo server');
			server.close();
		});
	});
});

process.on('exit', function () {
	var i;
	for (i in callback) {
		if (callback.hasOwnProperty(i)) {
			assert.ok(callback[i]);
		}
	}
});
