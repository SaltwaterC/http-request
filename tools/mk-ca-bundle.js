#!/usr/bin/env node

var fs = require('fs');

var ca = '';
var rs = fs.createReadStream(__dirname + '/../ca-bundle/ca-bundle.crt')

rs.on('data', function(data) {
	ca += data;
});

rs.on('end', function() {
	var idx, matches = ca.match(/(-----BEGIN CERTIFICATE-----[^]*?-----END CERTIFICATE-----)/g);

	for (idx in matches) {
		matches[idx] = matches[idx] + '\n';
	}

	fs.writeFile(__dirname + '/../lib/ca-bundle.json', JSON.stringify(matches), function(err) {
		if (err) {
			throw err;
		} else {
			console.log('Generated the ca-bundle.json file.');
		}
	});
});