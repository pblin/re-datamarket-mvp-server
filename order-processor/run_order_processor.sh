#!/bin/bash
CONTAINER_IMAGE=$1
if [ `docker ps | grep orderprocessor | wc -l` -gt 0 ]; then
	docker stop orderprocessor
fi
docker container prune -f 
docker run -d --rm --name=orderprocessor -v /tmp/orderlog:/tmp/orderlog $CONTAINER_IMAGE
