# http-request [![build status](https://secure.travis-ci.org/SaltwaterC/http-request.png?branch=master)](https://travis-ci.org/SaltwaterC/http-request) [![NPM version](https://badge.fury.io/js/http-request.png)](http://badge.fury.io/js/http-request)

General purpose HTTP / HTTPS client for node.js. Supports transparent gzip / deflate decoding. Successor of http-get.

## Installation

> npm install http-request

## Reference

 * The [Request](http://saltwaterc.github.io/http-request/module-request-Request.html) class - for implementing your own HTTP methods if wrappers aren't provided by the library
 * The [DELETE method](http://saltwaterc.github.io/http-request/module-main.html#delete)
 * The [GET method](http://saltwaterc.github.io/http-request/module-main.html#get)
 * The [HEAD method](http://saltwaterc.github.io/http-request/module-main.html#head)
 * The [POST method](http://saltwaterc.github.io/http-request/module-main.html#post)
 * The [PUT method](http://saltwaterc.github.io/http-request/module-main.html#put)
 * The [MIME sniffer](http://saltwaterc.github.io/http-request/module-main.html#mimeSniff)

## System Requirements

 * [node.js](http://nodejs.org/) v0.8.5+. Previous versions do not have proper SSL support.
 * [form-data](https://github.com/felixge/node-form-data)
 * [mmmagic](https://github.com/mscdex/mmmagic)

## Contributors

 * [cmtt](https://github.com/cmtt) - options.timeout, fixed the broken handling of buffered response when retrying the request with options.nocompress
 * [elarcent](https://github.com/elarcent) - HTTP Basic auth fix
 * [Gil Pedersen](https://github.com/kanongil) - Fixed the stream handling
 * [Stefan Klug](https://github.com/stefanklug) - Added support for custom Agent
