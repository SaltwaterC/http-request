## About [![build status](https://secure.travis-ci.org/SaltwaterC/http-get.png?branch=master)](http://travis-ci.org/SaltwaterC/http-get) ![still maintained](http://stillmaintained.com/SaltwaterC/http-get.png)

Simple to use node.js HTTP / HTTPS client for fetching remote resources. Supports transparent gzip / deflate decoding.

The client sends GET requests for fetching the remote objects. You may send HEAD requests if you just need to check the availability of a remote resource. The error reporting is implemented with care. The module itself is used in production for background data processing of thousands of remote resources, therefore it is not your average HTTP / HTTPS node.js client. It is in use for both of the transfer modes: buffered responses or streamed to the disk responses. Most of the decisions that made their way into the http-get are based onto the experience of working with a large URL database where a lot of things can go wrong.

## Installation

Either manually clone this repository into your node_modules directory, or the recommended method:

> npm install http-get

## Usage mode

 * The [GET method](https://github.com/SaltwaterC/http-get/wiki/GET-method)
 * The [HEAD method](https://github.com/SaltwaterC/http-get/wiki/HEAD-method)
 * [HTTP module internals](https://github.com/SaltwaterC/http-get/wiki/HTTP-module-internals)

## System Requirements

 * [node.js](http://nodejs.org/) v0.6.11+ for general usage. Previous versions are broken. Invalid domain names hang the event loop [#2688](https://github.com/joyent/node/pull/2688).
 * node.js v0.6.18+ with zlib bindings for using the transparent gzip / deflate decompression. Previous versions are broken. They don't have proper error reporting [#3230](https://github.com/joyent/node/issues/3230). node.js v0.6.11 - v0.6.17 may be used, but options.noCompress is forced as true.
 * node.js v0.8.5+ for actually using the mandatory SSL validation. Implemented in v0.8.4, but it is broken in that version. Therefore, http-get fails for HTTPS under v0.8.4. Before that, the custom agent does no validation at all, even though the client does not fail.

This library is not recommended under node.js v0.6.17 due to [this issue](https://groups.google.com/forum/#!topic/nodejs/6euYfwMmx1Y).

node.js v0.4 is **NOT** supported due to lack of zlib bindings. node.js v0.4 is only supported by the http-get v0.3 versions.

## Contributors

 * [cmtt](https://github.com/cmtt) - options.timeout, fixed the broken handling of buffered response when retrying the request with options.nocompress
 * [elarcent](https://github.com/elarcent) - HTTP Basic auth fix
 * [Gil Pedersen](https://github.com/kanongil) - Fixed the stream handling
 * [Stefan Klug](https://github.com/stefanklug) - Added support for custom Agent
