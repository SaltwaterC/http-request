'use strict';

/*global describe: true, it: true, before: true, after: true*/

var assert = require('chai').assert;
var mmm = require('mmmagic');

var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

var client = require('../');
var common = require('./common.js');

describe('MIME library compliance tests', function() {
	var server;

	before(function(done) {
		server = common.createFileServer(done);
	});

	describe('MIME: file not found', function() {
		it('should pass an error', function(done) {
			magic.detectFile('test/data/foobar', function(err, res) {
				assert.instanceOf(err, Error);

				assert.isUndefined(res);

				done();
			});
		});
	});

	// mimeSniff tests
	var testMimeSniff = function(type, mime) {
		describe('MIME: mimeSniff ' + type, function() {
			it('should detect the MIME type ' + mime, function(done) {
				client.mimeSniff('http://127.0.0.1:' + common.options.filePort + '/' + type + '.foo', function(err, res) {
					assert.ifError(err);

					assert.strictEqual(res, mime);

					done();
				});
			});
		});

		describe('MIME: validate mimeSniff ' + type, function() {
			it('should receive ' + mime + ' as content-type response header', function(done) {
				client.get('http://127.0.0.1:' + common.options.filePort + '/' + type + '.foo', function(err, res) {
					assert.ifError(err);

					assert.strictEqual(res.headers['content-type'], mime);

					done();
				});
			});
		});
	};

	testMimeSniff('bzip2', 'application/x-bzip2');
	testMimeSniff('gzip', 'application/x-gzip');
	testMimeSniff('pdf', 'application/pdf');
	testMimeSniff('tar', 'application/x-tar');
	testMimeSniff('text', 'text/plain');
	testMimeSniff('zip', 'application/zip');

	after(function() {
		server.close();
	});
});