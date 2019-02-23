#!/bin/bash
if [ `ps -ef | grep 'run watch' | wc -l` -lt 2 ]; then
       cd /home/mvp/webapp/server && nohup yarn run watch 2> /home/mvp/webapp/server/watch.log &
fi


