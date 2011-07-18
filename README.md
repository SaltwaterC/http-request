## About

Simple node.js HTTP / HTTPS client for downloading remote files. The client sends just GET requests for fetching the remote objects. Although the error reporting was implemented with care, it wasn't properly used with production data. Consider it a development preview. The production data smoke test will follow soon.

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

You may buffer the file without saving it to the disk. Useful if you download something that need to be processed without the need for saving the file:

```javascript
http.get({url: 'http://localhost/foo.xml'}, function (error, result) {
	if (error) {
		console.error(error);
	} else {
		console.log('The XML document contents: ' + result.buffer);
	}
});
```

Basically you need to pass the callback as the second argument of the get function instead of passing the file path. The buffered response mode is intended to be used only with textual data.

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

All the successful responses return the headers property that contains the response HTTP headers object. You may control any request header via the options.headers object. If is undefined, the User-Agent header is automatically set by the library. The 'Accept-Encoding: gzip' request header is always defined as the library uses the [compressor](https://github.com/egorich239/node-compress) library to do transparent gzip decoding of the response body.

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

In order to avoid redirect loops, the library has a hardcoded value that limits the recursive calls to 10 redirects. If you need to increase that value, you may pass the redirects property to the options object:

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

## Notice

All the errors that are returned after successful HTTP request contain a code property indicating the response.statusCode.
