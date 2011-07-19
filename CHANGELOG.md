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
