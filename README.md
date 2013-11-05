# http-request ![build status](https://secure.travis-ci.org/SaltwaterC/http-get.png?branch=master)

General purpose HTTP / HTTPS client for node.js. Supports transparent gzip / deflate decoding. Successor of http-get.

## Installation

Either manually clone this repository into your node_modules directory, or the recommended method:

> npm install http-request

## Reference

 * The [Request](http://saltwaterc.github.io/http-get/84e50cc04e.html) class - for implementing your own HTTP methods if wrappers aren't provided by the library
 * The [DELETE method](http://saltwaterc.github.io/http-get/module-main.html#delete)
 * The [GET method](http://saltwaterc.github.io/http-get/module-main.html#get)
 * The [HEAD method](http://saltwaterc.github.io/http-get/module-main.html#head)
 * The [POST method](http://saltwaterc.github.io/http-get/module-main.html#post)
 * The [PUT method](http://saltwaterc.github.io/http-get/module-main.html#put)
 * The [MIME sniffer](http://saltwaterc.github.io/http-get/module-main.html#mimeSniff)

## System Requirements

 * [node.js](http://nodejs.org/) v0.8.5+. Previous versions do not have proper SSL support.

## Contributors

 * [cmtt](https://github.com/cmtt) - options.timeout, fixed the broken handling of buffered response when retrying the request with options.nocompress
 * [elarcent](https://github.com/elarcent) - HTTP Basic auth fix
 * [Gil Pedersen](https://github.com/kanongil) - Fixed the stream handling
 * [Stefan Klug](https://github.com/stefanklug) - Added support for custom Agent
