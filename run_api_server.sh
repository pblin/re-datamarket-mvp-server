#!/bin/bash
CONTAINER_IMAGE=$1
if [ `docker ps | grep searchapi | wc -l` -gt 0 ]; then
	docker stop apiserver
fi
docker container prune -f 
docker run -d --rm -p 9000-9001:9000-9001 --name=apiserver $CONTAINER_IMAGE
docker image prune