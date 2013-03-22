'use strict';

/*global describe: true, it: true, before: true, after: true*/

var client = require('../');
var common = require('./common.js');

var u = require('url');
var fs = require('fs');
var assert = require('chai').assert;

describe('HTTP GET method tests', function() {
    var server, secureServer;

    before(function(done) {
        var servers = common.createServers(done);
        server = servers.server;
        secureServer = servers.secureServer;
    });

    describe('GET Hello World Buffer - plain', function() {
        it('should pass "Hello World" buffer', function(done) {
            client.get({
                url: 'http://127.0.0.1:' + common.options.port + '/hello-plain',
                noCompress: true
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.code, 200, 'the status is success');
                assert.isObject(res.headers, 'there is a headers object');
                assert.isUndefined(res.headers['content-encoding'], 'the content must not be encoded');
                assert.instanceOf(res.buffer, Buffer, 'the buffer is an instance of Buffer');
                assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');

                done();
            });
        });
    });

    describe('GET Hello World Buffer - gzip', function() {
        it('should pass "Hello World" buffer', function(done) {
            client.get({
                url: 'http://127.0.0.1:' + common.options.port + '/hello-gzip',
                headers: {
                    'accept-encoding': 'gzip'
                }
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.headers['content-encoding'], 'gzip', 'the content is encoded with gzip');
                assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');

                done();
            });
        });
    });

    describe('GET Hello World Buffer - deflate', function() {
        it('should pass "Hello World" buffer', function(done) {
            client.get({
                url: 'http://127.0.0.1:' + common.options.port + '/hello-deflate',
                headers: {
                    'accept-encoding': 'deflate'
                }
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.headers['content-encoding'], 'deflate', 'the content is encoded with deflate');
                assert.strictEqual(res.buffer.toString(), 'Hello World', 'we  got back the proper string');

                done();
            });
        });
    });

    describe('GET Basic Authentication', function() {
        it('should pass back the basic authentication', function(done) {
            var url = u.format({
                protocol: 'http:',
                hostname: '127.0.0.1',
                port: common.options.port,
                pathname: '/basic-auth',
                auth: 'user@example.com:pass word'
            });

            client.get(url, function(err, res) {
                assert.isNull(err, 'we have an error');

                var auth = JSON.parse(res.buffer.toString());
                var urlAuth = u.parse(url).auth.split(/:/);

                assert.strictEqual(auth.username, urlAuth[0]);
                assert.strictEqual(auth.password, urlAuth[1]);

                done();
            });
        });
    });

    describe('GET broken DNS name over HTTP', function() {
        it('should fail with an error passed back to the completion callback', function(done) {
            client.get('http://.foo.bar/', function(err, res) {
                assert.instanceOf(err, Error, 'the error is an Error instance');
                assert.strictEqual(err.url, 'http://.foo.bar/');

                assert.isUndefined(res, 'we have a response');

                done();
            });
        });
    });

    describe('GET broken DNS name over HTTPS', function() {
        it('should fail with an error passed back to the completion callback', function(done) {
            client.get('https://.foo.bar/', function(err, res) {
                assert.instanceOf(err, Error, 'the error is an Error instance');
                assert.strictEqual(err.url, 'https://.foo.bar/');

                assert.isUndefined(res, 'we have a response');

                done();
            });
        });
    });

    describe('GET DNS error', function() {
        it('should fail with an error passed back to the completion callback', function(done) {
            client.get('http://foo.bar/', function(err, res) {
                assert.instanceOf(err, Error, 'the error is an Error instance');
                assert.strictEqual(err.code, 'ENOTFOUND');
                assert.strictEqual(err.url, 'http://foo.bar/');

                assert.isUndefined(res, 'we have a response');

                done();
            });
        });
    });

    describe('GET header reflect', function() {
        it('should pass back the header foo sent from the client', function(done) {
            client.get({
                url: 'http://127.0.0.1:' + common.options.port + '/header-reflect',
                headers: {
                    foo: 'bar'
                }
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.headers.foo, 'bar', 'we got the foo header back');
                assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got the proper response body');

                done();
            });
        });
    });

    describe('GET with invalid maxBody', function() {
        it('should throw an Error', function(done) {
            var throws = function() {
                client.get({
                    url: 'http://127.0.0.1:' + common.options.port + '/',
                    maxBody: 'foo'
                }, function(err, res) {

                });
            };

            assert.throws(throws, Error, 'Invalid options.maxBody specification. Expecting a proper integer value.');

            done();
        });
    });

    describe('GET with invalid progress', function() {
        it('should throw an Error', function(done) {
            var throws = function() {
                client.get({
                    url: 'http://127.0.0.1:' + common.options.port + '/',
                    progress: 'foo'
                }, function(err, res) {

                });
            };

            assert.throws(throws, Error, 'Expecting a function as progress callback.');

            done();
        });
    });

    describe('GET without protocol prefix', function() {
        it('should work fine by prepending http:// to the URL', function(done) {
            client.get('127.0.0.1:' + common.options.port + '/no-protocol-prefix', function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.code, 200, 'the HTTP status code is OK');
                assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
                assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got the proper buffer');

                done();
            });
        });
    });

    describe('GET ranged content', function() {
        it('should return just part of the content', function(done) {
            client.get({
                url: 'http://127.0.0.1:' + common.options.port + '/range-request',
                headers: {
                    range: 'bytes=0-5'
                },
                noCompress: true
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.code, 206, 'we have the proper status code');
                assert.isDefined(res.headers['content-length'], 'we have a Content-Lenght');
                assert.strictEqual(res.headers['content-range'], '0-5/11', 'we have the proper value for the Content-Range response header');

                assert.strictEqual(res.buffer.toString(), 'Hello', 'we have the proper partial content');

                done();
            });
        });
    });

    describe('GET with redirect', function() {
        it('should redirect succesfully', function(done) {
            client.get({
                url: 'http://127.0.0.1:' + common.options.port + '/redirect',
                noCompress: true
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
                assert.strictEqual(res.url, 'http://127.0.0.1:' + common.options.port + '/redirect-target', 'we got the proper URL back');

                done();
            });
        });
    });

    describe('GET with progress callback', function() {
        it('should call the progress callback', function(done) {
            client.get({
                url: 'http://127.0.0.1:' + common.options.port + '/progress',
                progress: function(current, total) {
                    // there's a single data event
                    // the Hello World is compressed with gzip
                    // but larger than the payload

                    assert.strictEqual(current, 31);
                    assert.strictEqual(total, 31);
                }
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
                assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
                assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got back the proper buffer');

                done();
            });
        });
    });

    describe('GET over HTTPS with SSL validation', function() {
        it('should verify succesfully the connection', function(done) {
            client.get({
                url: 'https://127.0.0.1:' + common.options.securePort + '/ssl-validation',
                headers: {
                    host: 'http-get.lan'
                },
                ca: [require('./ca.js')]
            }, function(err, res) {
                assert.isNull(err);

                assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
                assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
                assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got back the proper buffer');

                done();
            });
        });
    });

    describe('GET without url', function() {
        it('should throw an error', function(done) {
            var throws = function() {
                client.get({}, function(err, res) {});
            };

            assert.throws(throws, Error, 'The options object requires an input URL value.');

            done();
        });
    });

    describe('GET 404', function() {
        it('should buffer the error document', function(done) {
            var url = 'http://127.0.0.1:' + common.options.port + '/not-found';
            client.get(url, function(err, res) {
                assert.instanceOf(err, Error, 'the error is an instance of Error');
                assert.strictEqual(err.document.toString(), 'Not Found', 'we got back the proper error document');
                assert.strictEqual(err.largeDocument, false, 'no error document overflow');
                assert.strictEqual(err.url, url, 'the error object has the proper URL');
                assert.strictEqual(err.headers['content-encoding'], 'gzip');

                assert.isUndefined(res, 'we have a response');

                done();
            });
        });
    });

    describe('GET with redirect loop', function() {
        it('should detect the condition and pass the error argument to the completion callback', function(done) {
            var url = 'http://127.0.0.1:' + common.options.port + '/redirect-loop';

            client.get(url, function(err, res) {
                assert.instanceOf(err, Error, 'the error is an instance of Error');
                assert.strictEqual(err.message, 'Redirect loop detected after 10 requests.', 'the proper message is passed back to the user');
                assert.strictEqual(err.code, 301, 'the error code is equal to the code of the HTTP response');
                assert.strictEqual(err.url, url, 'the error object has the proper URL');

                assert.isUndefined(res, 'we have a response');

                done();
            });
        });
    });

    describe('GET with maxBody limit', function() {
        it('should detect that the buffer is overflowing the user limit', function(done) {
            var url = 'http://127.0.0.1:' + common.options.port + '/max-body';
            client.get({
                url: url,
                maxBody: 2
            }, function(err, res) {
                assert.instanceOf(err, Error, 'the error is an instance of Error');
                assert.strictEqual(err.message, 'Large body detected.', 'the proper message is passed back to the client');
                assert.strictEqual(err.code, 200, 'the error code is equal to the code of the HTTP response');
                assert.strictEqual(err.url, url, 'the error object has the proper URL');

                assert.isUndefined(res, 'we have a response');

                done();
            });
        });
    });

    describe('GET with null argument for the file argument', function() {
        it('should simulate writing the file /dev/null in a cross platform way', function(done) {
            client.get('http://127.0.0.1:' + common.options.port + '/redirect', null, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.code, 200, 'the status is success');
                assert.isObject(res.headers, 'there is a headers object');

                // regression test for the fix from v0.4.2
                assert.isUndefined(res.buffer, 'there is no buffered data');

                done();
            });
        });
    });

    describe('GET with gzipped response without being requested', function() {
        it('should return gzipped content without being requested', function(done) {
            client.get({
                url: 'http://127.0.0.1:' + common.options.port + '/force-gzip',
                noCompress: true
            }, function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.code, 200, 'the HTTP status code is OK');
                assert.strictEqual(res.headers['content-encoding'], 'gzip', 'we got back gzip even though it was not requested');
                assert.strictEqual(res.buffer.toString(), 'Hello World', 'we got back the proper buffer');

                done();
            });
        });
    });

    describe('GET response saved to file', function() {
        it('should save the response body to a file', function(done) {
            client.get('http://127.0.0.1:' + common.options.port + '/save-to-file', 'hello.txt', function(err, res) {
                assert.isNull(err, 'we have an error');

                assert.strictEqual(res.code, 200);
                assert.strictEqual(res.headers['content-type'], 'text/plain');

                fs.stat(res.file, function(err) {
                    assert.isNull(err, 'we have an error');

                    fs.readFile(res.file, function(err, data) {
                        assert.isNull(err, 'we have an error');

                        assert.strictEqual(data.toString(), 'Hello World');

                        fs.unlink(res.file, function(err) {
                            assert.isNull(err);

                            done();
                        });
                    });
                });
            });
        });
    });

    describe('GET stream passed to client', function() {
        it('should pass back a readable stream to the client', function(done) {
            client.get({
                url: 'http://127.0.0.1:' + common.options.port + '/pass-stream',
                stream: true,
                noCompress: true
            }, function(err, res) {
                var count = 0;

                assert.isNull(err, 'we have an error');
                assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
                assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
                assert.strictEqual(res.headers['content-length'], '11', 'we got the proper size for the data');

                res.stream.on('data', function(data) {
                    count += data.length;
                });

                res.stream.on('end', function() {
                    assert.strictEqual(count, 11, 'we have the proper size for the stream');

                    done();
                });

                res.stream.on('error', function(err) {
                    assert.isNull(err, 'we have an error');
                });

                res.response.resume();
            });
        });
    });

    describe('GET with gzip compressed stream passed to client', function() {
        it('should pass back a decompressed readable stream to the client', function(done) {
            client.get({
                url: 'http://127.0.0.1:' + common.options.port + '/pass-decompressed-stream',
                stream: true
            }, function(err, res) {
                var count = 0;

                assert.isNull(err, 'we have an error');
                assert.strictEqual(res.code, 200, 'we got the proper HTTP status code');
                assert.strictEqual(res.headers['content-type'], 'text/plain', 'we got the proper MIME type');
                assert.strictEqual(res.headers['content-length'], '31', 'we got the proper size for the compressed data');

                res.stream.on('data', function(data) {
                    count += data.length;
                });

                res.stream.on('end', function() {
                    assert.strictEqual(count, 11, 'we have the proper size for the decompressed stream');

                    done();
                });

                res.stream.on('error', function(err) {
                    assert.isNull(err, 'we have an error');
                });

                res.response.resume();
            });
        });
    });

    describe('GET with error passed to the completion callback by the fs module', function() {
        it('should pass back an error from the fs module', function(done) {
            var path = 'world.txt';

            fs.open(path, 'w+', function(err, fd) {
                assert.isNull(err, 'we have an error');

                fs.close(fd, function(err) {
                    assert.isNull(err, 'we have an error');

                    fs.chmod(path, '0100', function(err) {
                        assert.isNull(err, 'we have an error');

                        var url = 'http://127.0.0.1:' + common.options.port + '/save-to-invalid-file';
                        client.get(url, path, function(err, res) {
                            assert.instanceOf(err, Error, 'the error is an instance of Error');
                            assert.strictEqual(err.code, 'EACCES', 'we have the proper error code');
                            assert.strictEqual(err.url, url);

                            assert.isUndefined(res, 'we have a response');

                            fs.unlink(path, function(err) {
                                assert.isNull(err);

                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    describe('GET with overflowing error document', function() {
        it('should detect the situation and act accordingly', function(done) {
            client.get({
                url: 'http://127.0.0.1:' + common.options.port + '/big-error',
                noCompress: true
            }, function(err, res) {
                assert.instanceOf(err, Error, 'the error is an instance of Error');

                assert.strictEqual(err.code, 404, 'we got back the proper status code');
                assert.strictEqual(err.largeDocument, true, 'we detect the overflowing error document');
                assert.strictEqual(err.noDocument, false, 'we detect that there was a document, but could not be buffered');
                assert.strictEqual(err.headers['content-length'], '1048577', 'we got the content length of the overflowing error document');
                assert.strictEqual(err.url, 'http://127.0.0.1:' + common.options.port + '/big-error', 'we got back the proper error URL');

                done();
            });
        });
    });

    after(function() {
        server.close();
        secureServer.close();
    });
});
