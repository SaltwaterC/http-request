// Copyright 2009, Acknack Ltd. All rights reserved.
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

var fs = require('fs'),
    sys = require('sys'),
    gzbz2 = require('gzbz2'),
    stream = require('stream');

/**
 * wrap an readable stream (for binary data) with gunzip
 */
var GunzipStream = function(readStream, enc) {
    stream.Stream.call(this);
    var self = this;

    self.stream = readStream;
    self.gz = new gzbz2.Gunzip();
    self.gz.init({encoding: enc});

    self.ondata = function(data) {
        try {
            var inflated = self.gz.inflate(data);
        } catch (err) {
            self.gz.end();
            self.emit('error', err);
            self._cleanup();
            return;
        }
        self.emit('data', inflated);
    };
    self.onclose = function() {
        self.gz.end();
        self.emit('close');
        self._cleanup();
    };
    self.onend = function() {
        self.gz.end();
        self.emit('end');
        self._cleanup();
    };
    self.onerror = function(err) {
        self.gz.end();
        self.emit('error', err);
        self._cleanup();
    };
    self.pause = function() {
        self.stream.pause();
    };
    self.resume = function() {
        self.stream.resume();
    };
    self._cleanup = function() {
        self.stream.removeListener('data', self.ondata);
        self.stream.removeListener('close', self.onclose);
        self.stream.removeListener('end', self.onend);
        self.stream.removeListener('error', self.onerror);
    };

    self.stream.addListener('data', self.ondata);
    self.stream.addListener('end', self.onend);
    self.stream.addListener('close', self.onclose);
    self.stream.addListener('error', self.onerror);
};
sys.inherits(GunzipStream, stream.Stream);
exports.GunzipStream = GunzipStream;

/**
 * this method accepts 4 main flavors:
 *
 * none             gunzip from stdin
 * ---------------------------------------------------------------
 * @param stream    ReadStream, if null/undefined, use stdin
 * ---------------------------------------------------------------
 * @param path      string pathname, if null/undefined: use stdin
 * ---------------------------------------------------------------
 * @param path      string pathname, if null/undefined && options.fd == null/undefined, use stdin
 * @param options   as would be given to fs.createReadStream()
 *
 * @return  a GunzipStream object, the underlying ReadStream is available as attribute named 'stream'
 */
exports.wrap = function() {
    // [stream] | [path, [options,]]
    var stream = arguments[0], options = arguments[1];
    var enc = options.encoding;
    if( stream == null ) {
        if( options.fd == null ) {
            stream = process.openStdin();
        }
    } else if( typeof stream == 'string' ) {
        if( options ) {
            // we want to use buffers
            options.encoding = null;
        }
        stream = fs.createReadStream(stream, options);
    } // else stream is all set, options (if provided) are ignored
    return new GunzipStream(stream, enc);
};
