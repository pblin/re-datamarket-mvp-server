#!/bin/bash
CONTAINER_IMAGE=$1
docker stop searchapi
docker container prune -f 
docker run -d -p 8082:8082 --name=searchapi $CONTAINER_IMAGE