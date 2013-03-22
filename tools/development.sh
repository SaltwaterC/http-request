#!/usr/bin/env bash

function production()
{
	sed=$(which gsed)
	if [ $? -ne 0 ]
	then
		sed=sed
	fi
	find $1 -name "*.js" | xargs $sed -i "s#[/]\+tools\.debug#tools\.debug#g"
}

production lib
