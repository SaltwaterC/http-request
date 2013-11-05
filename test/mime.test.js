'use strict';

/*global describe: true, it: true, before: true, after: true*/

var assert = require('chai').assert;
var mmm = require('mmmagic');

var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

describe('MIME library compliance tests', function() {

	describe('MIME file not found', function() {
		it('should pass an error', function(done) {
			magic.detectFile('test/data/foobar', function(err, res) {
				assert.instanceOf(err, Error);

				assert.isUndefined(res);

				done();
			});
		});
	});

	var testMime = function(type, mime) {
		describe('MIME ' + type, function() {
			it('should pass ' + mime, function(done) {
				magic.detectFile('test/data/' + type + '.foo', function(err, res) {
					assert.ifError(err);

					assert.strictEqual(res, mime);

					done();
				});
			});
		});
	};

	testMime('bzip2', 'application/x-bzip2');
	testMime('gzip', 'application/x-gzip');
	testMime('pdf', 'application/pdf');
	testMime('tar', 'application/x-tar');
	testMime('text', 'text/plain');
	testMime('zip', 'application/zip');

});
