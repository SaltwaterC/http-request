all:
	/usr/bin/env npm install

publish: all
	/usr/bin/env npm publish

test:
	/bin/sh tools/test.sh
