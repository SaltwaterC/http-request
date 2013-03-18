'use strict';

/*global describe: true, it: true, before: true, after: true*/

var client = require('../');
var common = require('./common.js');

var assert = require('chai').assert;

describe('HTTP HEAD method tests', function () {
	var server;
	
	before(function (done) {
		server = common.createServer(require('http'));
		
		server.listen(common.options.port, function () {
			done();
		});
	});
	
	describe('HEAD Hello World - plain', function () {
		it('should pass the response headers', function (done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/',
				noCompress: true
			}, function (err, res) {
				assert.isNull(err, 'we have an error');
				
				assert.strictEqual(res.code, 200, 'the status is success');
				assert.typeOf(res.headers, 'object', 'there is a headers object');
				assert.isUndefined(res.headers['content-encoding'], 'the content must not be encoded');
				
				done();
			});
		});
	});
	
	describe('HEAD Hello World - gzip', function () {
		it('should pass the response headers', function (done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/',
				headers: {
					'accept-encoding': 'gzip'
				}
			}, function (err, res) {
				assert.isNull(err, 'we have an error');
				
				assert.strictEqual(res.headers['content-encoding'], 'gzip', 'the content is encoded with gzip');
				
				done();
			});
		});
	});
	
	describe('HEAD Hello World - deflate', function () {
		it('should pass the response headers', function (done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/',
				headers: {
					'accept-encoding': 'deflate'
				}
			}, function (err, res) {
				assert.isNull(err, 'we have an error');
				
				assert.strictEqual(res.headers['content-encoding'], 'deflate', 'the content is encoded with deflate');
				
				done();
			});
		});
	});
	
	describe('HEAD redirect without location header', function () {
		it('should return the error argument', function (done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/redirect-without-location',
				noCompress: true
			}, function (err, res) {
				assert.instanceOf(err, Error, 'the error is an Error instance');
				assert.strictEqual(err.code, 301, 'the error code should be equal to the HTTP status code');
				assert.strictEqual(err.url, 'http://127.0.0.1:' + common.options.port + '/redirect-without-location', 'the URL must be passed back to the completion callback');
				
				assert.isUndefined(res);
				
				done();
			});
		});
	});
	
	describe('HEAD broken DNS name over HTTP', function () {
		it('should fail with an error passed back to the completion callback', function (done) {
			client.head('http://.foo.bar/', function (err, res) {
				assert.instanceOf(err, Error, 'the error is an Error instance');
				assert.strictEqual(err.url, 'http://.foo.bar/');
				
				done();
			});
		});
	});
	
	describe('HEAD broken DNS name over HTTPS', function () {
		it('should fail with an error passed back to the completion callback', function (done) {
			client.head('https://.foo.bar/', function (err, res) {
				assert.instanceOf(err, Error, 'the error is an Error instance');
				assert.strictEqual(err.url, 'https://.foo.bar/');
				
				done();
			});
		});
	});
	
	describe('HEAD DNS error', function () {
		it('should fail with an error passed back to the completion callback', function (done) {
			client.head('http://foo.bar/', function (err, res) {
				assert.instanceOf(err, Error, 'the error is an Error instance');
				assert.strictEqual(err.code, 'ENOTFOUND');
				assert.strictEqual(err.url, 'http://foo.bar/');
				
				done();
			});
		});
	});
	
	describe('HEAD header reflect', function () {
		it('should pass back the header foo sent from the client', function (done) {
			client.head({
				url: 'http://127.0.0.1:' + common.options.port + '/header-reflect',
				headers: {
					foo: 'bar'
				}
			}, function (err, res) {
				assert.isNull(err, 'we have an error');
				
				assert.strictEqual(res.headers.foo, 'bar', 'we got the foo header back');
				
				done();
			});
		});
	});
	
	after(function () {
		server.close();
	});
	
});
