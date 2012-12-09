#!/usr/bin/env node

var fs = require('fs');

var ca = '';
var rs = fs.createReadStream(__dirname + '/../ca-bundle/ca-bundle.crt')

rs.on('data', function (data) {
	ca += data;
});

rs.on('end', function () {
	var json = JSON.stringify(ca.match(/(-----BEGIN CERTIFICATE-----[^]*?-----END CERTIFICATE-----)/g));
	fs.writeFile(__dirname + '/../lib/ca-bundle.json', json, function (err) {
		if (err) {
			throw err;
		} else {
			console.log('Generated the ca-bundle.json file.');
		}
	});
});
