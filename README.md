## About ![still maintained](http://stillmaintained.com/SaltwaterC/http-get.png)

Simple to use node.js HTTP / HTTPS client for fetching remote resources. Supports transparent gzip decoding via [gzbz2](https://github.com/Woodya/node-gzbz2).

The client sends GET requests for fetching the remote objects. You may send HEAD requests if you just need to check the availability of a remote resource. The error reporting is implemented with care. The module itself is used in production for background data processing of thousands of remote resources, therefore it is not your average HTTP / HTTPS node.js client. It is in use for both of the transfer modes: buffered responses or streamed to the disk responses. Most of the decisions that made their way into the http-get are based onto the experience of working with a large URL database where a lot of things can go wrong.

## Installation

Either manually clone this repository into your node_modules directory, or the recommended method:

> npm install http-get

If you need gzip decoding support:

> npm install http-get gzbz2

## Usage mode

 * The [GET method](https://github.com/SaltwaterC/http-get/wiki/GET-method)
 * The [HEAD method](https://github.com/SaltwaterC/http-get/wiki/HEAD-method)
 * [HTTP module internals](https://github.com/SaltwaterC/http-get/wiki/HTTP-module-internals)

## System Requirements

 * [node.js](http://nodejs.org/) v0.4.11+. If this version seems unreasonable, here are some reasons: [#1085](https://github.com/joyent/node/issues/1085), [#1304](https://github.com/joyent/node/issues/1304), [#1202](https://github.com/joyent/node/issues/1202).
 * [node.js](http://nodejs.org/) v0.6.11+. If this version seems unreasonable, here is the reason: [#2688](https://github.com/joyent/node/pull/2688)

## Optional modules

 * gzbz2 v0.1.1+ for gzip decompression. It was reported that gzbz2 might not build successfully for some users, therefore it's now an optional dependency. However, it's still recommended to install gzbz2. This will be handled automatically when npm will eventually support [optionalDependencies](https://github.com/isaacs/npm/issues/995). Please notice that the support for gzbz2 will be dropped in the future. The native gzip support in node.js v0.6+ will take its place.

## Contributor

 * [cmtt](https://github.com/cmtt) - options.timeout
