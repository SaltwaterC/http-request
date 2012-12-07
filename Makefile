all:
	/usr/bin/env npm install

lint:
	tools/lint.sh

publish: all
	/usr/bin/env npm publish

tests: test
check: test
test: lint
	tools/test.sh
