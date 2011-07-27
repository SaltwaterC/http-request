var http = require('http');

var options = {
	host: '127.0.0.1',
	port: 42890
};

exports.options = options;

exports.createFooServer = function (cb) {
	var server = http.createServer(function (req, res) {
		res.writeHead(200, {'content-type': 'text/plain'});
		res.end('foo');
	});
	
	server.listen(options.port, options.host, cb);
	
	return server;
};
