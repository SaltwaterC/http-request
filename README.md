## About ![build status](https://secure.travis-ci.org/SaltwaterC/http-get.png?branch=master)

General purpose HTTP / HTTPS client for node.js. Supports transparent gzip / deflate decoding.

## Installation

Either manually clone this repository into your node_modules directory, or the recommended method:

> npm install http-request

## Reference

 * The [Request] class - for implementing your own HTTP methods if wrappers aren't provided by the library
 * The [DELETE method]
 * The [GET method]
 * The [HEAD method]
 * The [POST method]
 * The [PUT method]

## System Requirements

 * [node.js](http://nodejs.org/) v0.8.5+. Previous versions do not have proper SSL support.

## Contributors

 * [cmtt](https://github.com/cmtt) - options.timeout, fixed the broken handling of buffered response when retrying the request with options.nocompress
 * [elarcent](https://github.com/elarcent) - HTTP Basic auth fix
 * [Gil Pedersen](https://github.com/kanongil) - Fixed the stream handling
