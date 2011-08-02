## v0.2
 * Internal change: simpler method for detecting a redirect.
 * In order to follow the node.js callback convention, in case of success, the error argument is null, not undefined. This may break some existing code if the evaluation is made against 'undefined'.
 * Fixes the maxbody support as both the fail and the success code was executed in certain race conditions.
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
