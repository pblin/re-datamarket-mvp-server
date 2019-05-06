#!/bin/bash
CONTAINER_IMAGE=$1
if [ `docker ps | grep apiserver | wc -l` -gt 0 ]; then
	docker stop apiserver
fi
docker container prune -f 
docker run -d --rm -p 9000:9000 --name=apiserver $CONTAINER_IMAGE
