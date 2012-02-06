## v0.3.13
 * Made a v0.6 specific workaround where the request may be retried when the maxbody error is returned.
 * Support for node v0.6.11+. Previous versions of node.js are broken due to [#2688](https://github.com/joyent/node/pull/2688).

## v0.3.12
 * Makes sure options.timeout is disabled for node v0.4.x since request.setTimeout() is unavailable.

## v0.3.11
 * Added options.timeout by [cmtt](https://github.com/cmtt).

## v0.3.10
 * Fixes a protocol breaking. The server may respond with gzip encoded content although not requested.

## v0.3.9
 * Updates the gzbz2 dependency to v0.1.1. Removes the bundled patched version of gunzipstream.js since the upstream avoids the gunzip -5 errors.

## v0.3.8
 * Fixes [#1](https://github.com/SaltwaterC/http-get/issues/1): Get with file does not callback.

## v0.3.7
 * Improves the stability of the gzip support. In some cases, broken servers prematurely close the connection for gzipped responses. The request is now reissued without the gzip support.

## v0.3.6
 * Improved the stability of the fsync(2) wrapper. The ocasional ENOENT errors should dissapear now.
 * Fixes the auto-prefix functionality: if the http:// or https:// is missing, then http:// is automatically prepended. Now it specifically checks for http:// or https://.

## v0.3.5
 * Makes gzbz2 to be an optional dependency. If it doesn't build, you can still use http-get.

## v0.3.4
 * Implemented the upstream proposed patch for the [gz.inflate() issue of node-gzbz2](https://github.com/Woodya/node-gzbz2/pull/1).
 * Removed the workaround for the node.js issue [#1202](https://github.com/joyent/node/issues/1202). node.js v0.4.11 is the minimal supported version by this release.

## v0.3.3
 * Fixes the HEAD method that wronfully used http.get() / https.get().
 * Workaround for node.js issue [#1202](https://github.com/joyent/node/issues/1202).

## v0.3.2
 * This release includes a patched version of the gzbz2/gunzipstream module in order to workaround the gz error -5. The rest of the gzip dependency is still taken from the upstream module.

## v0.3.1
 * The library calls the error code if the server prematurely closes the connection. In the future, if the accept-ranges header is defined into the response headers, the library should try to send subsequent requests in order to get the whole response.

## v0.3
 * Dropped the [compressor](https://github.com/egorich239/node-compress) module in favor of [gzbz2](https://github.com/Woodya/node-gzbz2). More stable gzip support as the compressor module proved to completely hang the module in certain cases when it would not emit any of the end / close events.
 * Better interaction with the disk operations. The module makes use of [fsync(2)](http://linux.die.net/man/2/fsync).

## v0.2.1
 * Simple maintenance release for cleaning up the junk from the npm package.

## v0.2
 * Internal change: simpler method for detecting a redirect.
 * In order to follow the node.js callback convention, in case of success, the error argument is null, not undefined. This may break some existing code if the evaluation is made against 'undefined'.
 * Fixes the maxbody support as both the fail and the success code was executed in certain race conditions.
 * Fixes the file stream support as both the fail and the success code was executed in certain race conditions.
 * Unit testing coverage.

## v0.1.6
 * Internal changes to follow the [DRY](http://en.wikipedia.org/wiki/Don't_repeat_yourself) principle.
 * Added the response.url property of a successful response that comes after a redirect in order to return the final URL of the request.
 * Added the head method for sending HEAD requests. It's nice to poke at the remote resource without bothering with the response body.
 * Added the documentation as wiki pages which makes it more maintainable.

## v0.1.5
 * node.js 0.4.10 specific build. Basically it removes the [backport-0.4](https://github.com/SaltwaterC/backport-0.4) dependency which is now obsolete.
 * In case of HTTP failure, the error argument also contains a headers property that returns the raw response headers.

## v0.1.4
 * Added support for options.nogzip to disable the gzip encoding.
 * Made sure that if gzip fails, the request is sent again with options.nogzip enabled.

## v0.1.3
 * Exposes setMaxSockets() for changing the http.Agent.defaultMaxSockets value.
 * Fixes the lack of accept-encoding: gzip that was commented by mistake aka no transparent gzip support in v0.1.1 - v0.1.2.

## v0.1.2
 * Explicit node version < 0.5.0 in package.json as the compressor module segfaults under node v0.5.0.

## v0.1.1
 * Implemented the options.maxbody option in order to limit the size of the buffered response.

## v0.1
 * Initial version, featuring HTTP / HTTPS support, transparent gzip support, buffered / saved to disk responses, HTTP / HTTPS proxy support.
