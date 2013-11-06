#!/usr/bin/env bash

function development()
{
	SED=$(which gsed || which sed)
	find "$1" -name "*.js" | xargs $SED -i "s#[/]\+tools\.debug#tools\.debug#g"
}

development lib
