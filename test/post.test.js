'use strict';

/*global describe: true, it: true, before: true, after: true*/

var client = require('../');
var config = require('../package.json');

var common = require('./common.js');

var util = require('util');
var assert = require('chai').assert;

describe('HTTP POST method tests', function() {
	var server, secureServer, proxy;

	before(function(done) {
		var servers = common.createServers(done);
		server = servers.server;
		secureServer = servers.secureServer;
		proxy = servers.proxy;
	});

	describe('POST request shorthand', function() {
		it('should pass the arguments as query string into the request body', function(done) {
			client.post('http://127.0.0.1:' + common.options.port + '/post?foo=bar&baz=qux', function(err, res) {
				assert.ifError(err);

				assert.strictEqual(res.code, 200);
				assert.strictEqual(res.buffer.toString(), 'foo=bar&baz=qux');
				assert.strictEqual(res.headers['x-content-type'], 'application/x-www-form-urlencoded;charset=utf-8');

				done();
			});
		});
	});

	after(function() {
		server.close();
		secureServer.close();
		proxy.close();
	});

});
