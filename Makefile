.PHONY: all
.DEFAULT: all

all:
	/usr/bin/env npm install

ca-bundler:
	@cd ca-bundle && ../tools/mk-ca-bundle.pl
	@tools/mk-ca-bundle.js

lint:
	tools/lint.sh

publish: all
	/usr/bin/env npm publish

tests: test
check: test
test: all lint
	tools/test.sh
