#!/usr/bin/env bash

function lint
{
	output=$(find $1 -name "*.js" -print0 | xargs -0 ./node_modules/.bin/jslint --plusplus --white --var --goodparts --node | grep -v "is OK." | grep '[^[:space:]]')
	exit=$?
	
	echo "$output" | grep "[[:space:]]"
	
	if [ $exit -eq 0 ]
	then
		exit 1
	fi
}

lint lib
lint test
