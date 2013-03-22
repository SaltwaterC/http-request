.PHONY: all
.DEFAULT: all

all:
	@/usr/bin/env npm install

ca-bundler:
	@cd ca-bundle && ../tools/mk-ca-bundle.pl
	@tools/mk-ca-bundle.js
	$(MAKE) beautify

lint:
	@tools/lint.sh

publish: all
	@/usr/bin/env npm publish

tests: test
check: test
test: all lint
	@./node_modules/.bin/mocha

beautify:
	@tools/beautify.sh

doc:
	jsdoc --destination docs lib README.md

publishdoc: doc
	cd docs && git commit --all --message "Auto generated documentation" && git push origin gh-pages
