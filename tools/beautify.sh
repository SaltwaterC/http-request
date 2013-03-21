#!/usr/bin/env bash

beautify=$(which js-beautify)

if [ -z "$beautify" ]
then
	npm -g install js-beautify
fi

find . -name *.js -type f | grep -v node_modules | grep -v docs | xargs js-beautify --replace
find . -name *.json -type f | grep -v node_modules | grep -v docs | xargs js-beautify --replace
