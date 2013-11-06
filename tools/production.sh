#!/usr/bin/env bash

function production()
{
	SED=$(which gsed || which sed)
	find "$1" -name "*.js" | xargs $SED -i "s#tools\.debug#//tools\.debug#g"
}

production lib
