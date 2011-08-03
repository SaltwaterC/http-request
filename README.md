## About

Simple to use node.js HTTP / HTTPS client for downloading remote files. Supports transparent gzip decoding.

The client sends just GET requests for fetching the remote objects. You may send HEAD requests if you just need to check the availability of a remote resource. The error reporting is implemented with care. The module itself is used in production for background data processing of thousands of remote resources, therefore it is not your average HTTP client. It is in use for both of the transfer modes: buffered responses or streamed to the disk responses.

## Installation

Either manually clone this repository into your node_modules directory, or the recommended method:

> npm install http-get

## Usage mode

 * The [GET method](https://github.com/SaltwaterC/http-get/wiki/GET-method)
 * The [HEAD method](https://github.com/SaltwaterC/http-get/wiki/HEAD-method)
 * [HTTP module internals](https://github.com/SaltwaterC/http-get/wiki/HTTP-module-internals)
