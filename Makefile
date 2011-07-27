all:
	/usr/bin/env npm install

test: all
	/bin/sh tools/test.sh
