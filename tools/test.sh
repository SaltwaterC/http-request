#!/bin/sh

NODE_BIN='/usr/bin/env node'
FAIL=0
TOTAL=0

cd tests

for TEST in `dir -d ./*`
do
	if [ -f $TEST ]
	then
		echo "Running test: "`basename $TEST`
		$NODE_BIN $TEST > /dev/null
		EXIT_CODE=$?
		if [ $EXIT_CODE -ne 0 ]
		then
			FAIL=$(($FAIL+1))
		fi
		TOTAL=$(($TOTAL+1))
	fi
done

echo "Failed tests: $FAIL"
echo "Runned tests: $TOTAL"

exit 0
