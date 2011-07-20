## About

Simple to use node.js HTTP / HTTPS client for downloading remote files. Supports transparent gzip decoding. The client sends just GET requests for fetching the remote objects. The error reporting is implemented with care. The module itself is used in production for background data processing of thousands of remote resources, therefore it is not your average HTTP client.

However, in order to maintain the stability, you must follow exactly the system requirements. Due to various bugs in node.js < 0.4.10, currently v0.4.10 is the only supported version. The gzip decompression library crashes under node 0.5.x.

## Installation

Either manually clone this repository into your node_modules directory, or the recommended method:

> npm install http-get

## Usage mode

```javascript
var http = require('http-get');

http.get({url: 'http://localhost/foo.pdf'}, '/path/to/foo.pdf', function (error, result) {
	if (error) {
		console.error(error);
	} else {
		console.log('File downloaded at: ' + result.file);
	}
});
```

If you need to use basic HTTP authentication, pass the user:pass information to the HTTP URL itself. The target file path may be relative. [path.resolve()](http://nodejs.org/docs/latest/api/path.html#path.resolve) is used to obtain the absolute path.

You may buffer the file without saving it to the disk. Useful if you download something that need to be processed / dispatched without the need for saving the file:

```javascript
http.get({url: 'http://localhost/foo.xml'}, function (error, result) {
	if (error) {
		console.error(error);
	} else {
		console.log('The XML document contents: ' + result.buffer);
	}
});
```

Basically you need to pass the callback as the second argument of the get method instead of passing the file path. The buffered response mode is intended to be used only with textual data such as XML documents.

Both usage modes return the HTTP status code as result.code. If you use cache validation headers, 304 responses may be received. In this case, the result argument does not contain the file or buffer properties:

```javascript
var options = {
	url: 'http://localhost/foo.xml',
	headers: {
		'if-modified-since': 'Thu, 05 May 2011 12:58:38 GMT'
	}
};

http.get(options, function (error, result) {
	if (error) {
		console.error(error);
	} else {
		console.log(result); // {code: 304; headers: {/* raw HTTP headers */}}
	}
});
```

All the successful responses return the headers property that contains the response HTTP headers object. You may control any request header via the options.headers object. If is undefined, the User-Agent header is automatically set by the library. The 'Accept-Encoding: gzip' request header is always defined by default as the library uses the [compressor](https://github.com/egorich239/node-compress) library to do transparent gzip decoding of the response body.

If the body processing fails due to gzip decoding errors, the request is transparently reissued with the options.nogzip flag. This ensures the best compromise that even modern browsers like Firefox and Chrome don't implement. They simply bail out if the encoding is broken. http-get retries the request without 'Accept-Encoding: gzip'.

You may disable on demand the gzip decoding, although you may leave this job to the library itself:

```javascript
var options = {
	url: 'http://example.com/problematic/gzip/encoding.xml',
	nogzip: true
};

http.get(options, function (error, result) {
	if (error) {
		console.error(error);
	} else {
		console.log('The XML document contents: ' + result.buffer);
	}
});
```

You may also use a HTTP proxy:

```javascript
var options = {
	url: 'http://127.0.0.1/foo.xml',
	proxy: {
		host: '127.0.0.1',
		port: 3128
	}
};

http.get(options, function (error, result) {
	if (error) {
		console.error(error);
	} else {
		console.log('The XML document contents: ' + result.buffer);
	}
});
```

You may communicate with HTTPS enabled proxies, by passing options.proxy.https = true.

In order to avoid the redirect loops, the library has a hardcoded value that limits the recursive calls to 10 redirects. If you need to increase that value, you may pass the redirects property to the options object:

```javascript
var options = {
	url: 'http://localhost/foo.xml',
	redirects: 30
};

http.get(options, function (error, result) {
	if (error) {
		console.error(error);
	} else {
		console.log('The XML document contents: ' + result.buffer);
	}
});
```

The following responses are considered to be redirects if they have a response location header: 300, 301, 302, 303, 305, 307.

You may limit the buffered response body size:

```javascript
var options = {
	url: 'http://localhost/foo.txt', // 1.2 MiB object
	maxbody: 1048576 // 1 MiB max response body
};

http.get(options, function (error, result) {
	if (error) {
		console.error(error); // {/* ..., */ message: 'Large body detected.', code: 200 }
	} else {
		console.log(result);
	}
});
```

This is especially useful if you process batch data that isn't guarantee to have everything as expected.

If the number of [default maximum sockets](http://nodejs.org/docs/latest/api/http.html#agent.maxSockets) value is too small, you may adjust it by calling the exported setMaxSockets method:

```javascript
http.setMaxSockets(16);

for (...) {
	http.get(...);
}
```

Please note that by calling http.setMaxSockets you actually modify the underlying undocumented property http.Agent.defaultMaxSockets. This change affects all the clients that use the HTTP library, including the HTTPS client.

## Notice

All the errors that are returned after successful HTTP request contain a code property indicating the response.statusCode. They also contain a headers property that return the raw HTTP response headers.
