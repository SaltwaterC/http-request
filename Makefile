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

publish: all production
	@/usr/bin/env npm -f publish
	$(MAKE) development

tests: test
check: test
test: all lint
	@rm -f world.txt
	@./node_modules/.bin/mocha

beautify:
	@tools/beautify.sh

doc:
	jsdoc --destination ../docs lib README.md

docpublish: doc
	cd ../docs && git commit --all --message "Auto generated documentation" && git push origin gh-pages

prod: production
production:
	@tools/production.sh

dev: development
development:
	@tools/development.sh
