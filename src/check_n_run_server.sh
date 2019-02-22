#!/bin/bash
if [ `ps -ef | grep 'ts-node' | wc -l` -lt 2 ]; then
       cd /home/mvp/webapp/server && nohup yarn start 2> /home/mvp/webapp/server/watch.log &
fi

