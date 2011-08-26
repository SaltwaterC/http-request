## About

Simple to use node.js HTTP / HTTPS client for downloading remote files. Supports transparent gzip decoding via [gzbz2](https://github.com/Woodya/node-gzbz2).

The client sends just GET requests for fetching the remote objects. You may send HEAD requests if you just need to check the availability of a remote resource. The error reporting is implemented with care. The module itself is used in production for background data processing of thousands of remote resources, therefore it is not your average HTTP client. It is in use for both of the transfer modes: buffered responses or streamed to the disk responses.

## Installation

Either manually clone this repository into your node_modules directory, or the recommended method:

> npm install http-get

## Usage mode

 * The [GET method](https://github.com/SaltwaterC/http-get/wiki/GET-method)
 * The [HEAD method](https://github.com/SaltwaterC/http-get/wiki/HEAD-method)
 * [HTTP module internals](https://github.com/SaltwaterC/http-get/wiki/HTTP-module-internals)

## System Requirements

 * [node.js](http://nodejs.org/) v0.4.11+. If this version seems unreasonable, here are some reasons: [#1085](https://github.com/joyent/node/issues/1085), [#1304](https://github.com/joyent/node/issues/1304), [#1202](https://github.com/joyent/node/issues/1202). In order to use http-get up to its full potential, you must follow this restriction. If there's enough demand for using http-get under pre v0.4.11, then I'll reintroduce the [backport-0.4](https://github.com/SaltwaterC/backport-0.4) dependency and use up-to-date core libraries.
 * gzbz2 for gzip decompression. There are plans to make it an optional package when npm will support optionalDependencies: [#995](https://github.com/isaacs/npm/issues/995).
