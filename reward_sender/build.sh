#!/bin/bash
yarn install
cp main.js mining_report.js
RUNDIR=`pwd`
echo -e '#! /bin/sh\n' > start_bg.sh
echo -e "cd ${RUNDIR}" >> start_bg.sh
echo -e 'node mining_report.js >> mining_report.log 2>&1' >> start_bg.sh
echo -e 'echo OK' >> start_bg.sh