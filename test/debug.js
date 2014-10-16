// launches the test servers into a persistent state

'use strict';

if (process.argv[2] === 'servers') {
	require('./common.js').createServers(function() {
		console.log('Created the test servers');
	});
}