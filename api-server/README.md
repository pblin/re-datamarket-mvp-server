# rebloc-mvp-server
repo for MVP server side (API)


## to build
yarn install

## to run with server native
yarn run watch

yarn run serve

# Docker build
docker built -t dockerImage:tag -f ./Dockerfile.apiserver

# Docker run script
run_api_server.sh dockerImage:tag

# Vault (HashiCorop) secret store:
default: http://demo-app.rebloc.io:8200

# to get secret store for Stripe cc 
secret/stripe
skey (secret)

apitest (api test token)
tkey (api token)


