#!/bin/bash
if [ `ps -ef | grep 'run watch' | wc -l` -lt 2 ]; then
       cd /home/mvp/webapp/server && nohup yarn run watch 2> /home/mvp/webapp/server/watch.log &
fi

if [ `ps -ef | grep 'run serve' | wc -l` -lt 2 ]; then
       cd /home/mvp/webapp/server && nohup yarn run serve 2> /home/mvp/webapp/server/run.log &
fi

