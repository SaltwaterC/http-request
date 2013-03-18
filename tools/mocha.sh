#!/usr/bin/env bash

mocha=$(which mocha)

if [ -z "$mocha" ]
then
	npm -g install mocha
fi

mocha
