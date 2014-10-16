.PHONY: all
.DEFAULT: all
REPORTER ?= dot

all:
	@/usr/bin/env npm install

ca-bundler:
	@cd ca-bundle && ../tools/mk-ca-bundle.pl
	@tools/mk-ca-bundle.js
	$(MAKE) beautify

lint:
	@tools/lint.sh lib test

publish: all production
	@/usr/bin/env npm publish
	$(MAKE) development

tests: test
check: test
test: all lint
	@rm -f hello.txt
	@rm -f world.txt
	@rm -f foo.txt
	@./node_modules/.bin/mocha --reporter $(REPORTER)

test08:
	@npm install mocha chai form-data mmmagic multiparty@3.3.2
	@rm -f hello.txt
	@rm -f world.txt
	@rm -f foo.txt
	@./node_modules/.bin/mocha --reporter $(REPORTER)

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

contributors:
	@git shortlog -s -n --all

clean:
	rm -rf node_modules
