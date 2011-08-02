all:
	/usr/bin/env npm install

publish: all
	/usr/bin/env npm publish

test: all
	/bin/sh tools/test.sh
