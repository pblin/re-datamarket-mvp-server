import {VAULT_SERVER,VAULT_CLIENT_TOKEN,REDIS_HOST,REDIS_PORT, REDIS_TOKEN, DATA_HOST_URL} from './config/Env';
import {MarketplaceDB, OrderDetail} from './marketplace-db';
import * as Web3 from 'web3';
import * as uuidParse from 'uuid-parse';
import { Transaction } from 'ethereumjs-tx';
import { bufferToHex, privateToAddress } from 'ethereumjs-util';

const Queue = require('bee-queue');
const fetch = require('request-promise');
const loadJsonFile = require ('load-json-file');

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const options = {
    apiVersion: 'v1', // default
    endpoint: VAULT_SERVER, // default
    token:  VAULT_CLIENT_TOKEN // optional client token; 
  };

// const vault = require('node-vault')(options);
const vault = require ('node-vault')(options);
require('winston-daily-rotate-file');

const transport = new (winston.transports.DailyRotateFile)({
    filename: 'application-%DATE%.log',
    dirname: '/tmp/orderlog',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

const logger = winston.createLogger({
    transports: [
      transport
    ]
  });

export class OrderProcessor {
    queue;
    async connectToJobQueue() {
        //let result = await vault.read('secret/azureredis');
        console.log("connecting to queue");
        try {
                this.queue = new Queue('orders', {
                prefix: 'bq',
                stallInterval: 5000,
                nearTermWindow: 1200000,
                delayedDebounce: 1000,
                redis: {
                    host: REDIS_HOST,
                    port: REDIS_PORT,
                    db: 0,
                    auth_pass: REDIS_TOKEN, 
                    tls: {servername: REDIS_HOST},
                    options: {}
                },
                isWorker: true,
                getEvents: true,
                sendEvents: true,
                storeJobs: true,
                ensureScripts: true,
                activateDelayedJobs: false,
                removeOnSuccess: false,
                removeOnFailure: false,
                redisScanCount: 100
            });
        } catch (err) {
            console.log("queue connection error "+err)
        }
        return (1);
    }
    async process() {
        //logger.info ("chain provider " + CHAIN_IP);
        // const w3 = new Web3( new Web3.providers.HttpProvider(CHAIN_IP));
        // const accounts = await w3.eth.getAccounts();
        // console.log(accounts);

        // const w3 = new Web3(CHAIN_IP);
        // let contractJson  = await loadJsonFile('./src/abi/ReblocDatasetToken.json')
        // logger.info(contractJson['abi']);
        // let tokenContract = new w3.eth.Contract(contractJson['abi'], CONTRACT_ADDR, 
        //                       { from: OPERATOR_ADDR, gasLimit: 3000000 });
        // let pk;
        
        try {
            if (this.queue == null )  {
                let status = await this.connectToJobQueue();
                if (status == 0)
                    logger.error('redis error');
            } 
        } catch (err) {
            console.log(err);
            logger.info(err);
        }
            
        if (this.queue != null) { 

            this.queue.on('ready', () => {
                console.log("queue is ready.")
                logger.info('queue now ready to start doing things.');
            });
    
            this.queue.on('error', (err) => {
                logger.error(`A queue error happened: ${err.message}`);
            });
            // let result = await vault.read('crypto/operator');
            this.queue.process(async (job) => {
                try {
                    logger.info( `Processing job ${job.id}: ` + JSON.stringify(job.data));
                    
                    let marketplaceDB = new MarketplaceDB();
                    let datasetInfo = await marketplaceDB.getDataSet(job.data['dataset_id']);

                    if ( datasetInfo != null) {
                        let order:OrderDetail = {
                            ...job.data,
                            dataset_description: datasetInfo['description'],
                            dataset_name: datasetInfo['name'],
                            seller_id: datasetInfo['dataset_owner_id'],
                            data_hash: datasetInfo['data_hash'],
                            data_compression: datasetInfo['data_compression'],
                            num_of_records: datasetInfo['num_of_records'],
                            access_url: datasetInfo['access_url']
                        };

                        let buyerProfileInfo;
                        if (order['buyer_wallet_addr'] == undefined || order['buyer_wallet_addr'] == null) {
                            buyerProfileInfo = await marketplaceDB.getProfileWithId(order['buyer_id']);
                            order['buyer_wallet_addr'] = buyerProfileInfo['wallet_address_1'];
                        }
                        let sellerProfileInfo;
                        if (order['buyer_wallet_addr'] == undefined || order['buyer_wallet_addr'] == null || 
                            order['seller_email'] == undefined || order['seller_email'] == null ) {
                            // logger.info('dataset owner (=seller) id = ' + datasetInfo['dataset_owner_id']);
                            sellerProfileInfo= await marketplaceDB.getProfileWithId(datasetInfo['dataset_owner_id']);
                            logger.info('seller profile' + JSON.stringify(sellerProfileInfo));
                            order['seller_wallet_addr'] = sellerProfileInfo['wallet_address_1'];
                            order['seller_email'] = sellerProfileInfo['primary_email'];
                        }

                        logger.info('order info: '+JSON.stringify(order));
                        let url = datasetInfo['access_url'];
                        if  ( url != null) { 
                            //get ipfs hash fromr access url
                            let parts = url.split('/'); 
                            order['data_loc_hash'] = parts.pop() || parts.pop();
                        }
                        const web3TxUrl = DATA_HOST_URL + 'tx/send';
                    
                        const options ={
                            uri: web3TxUrl,
                            method: 'POST',
                            body: order,
                            json: true,
                            rejectUnauthorized: false
                        };
                        logger.info(JSON.stringify(options));

                        let response = await fetch(options);
                        logger.info(response);
                        
                        if (response['status'] == 'ok') {
                            order['blockchain_tx_id'] = response['txn_hash'];
                            let buyer = order['buyer_id'];
                            let seller = order['seller_id'];
                            let tokenId = response['token_id']
                            logger.info(`token id ${tokenId} transfered from ID:${seller} to ID:${buyer}`)

                        } else {
                            order['blockchain_tx_id'] = 'na'
                            logger.info(JSON.stringify(response));
                        }
                        let result = await marketplaceDB.saveOrder(order);
                        logger.info("order recorded =>" + result);

                        // logger.info("minting a token:");
                        // let nonce = await w3.eth.getTransactionCount(OPERATOR_ADDR);
                        // logger.info("nonce = " + nonce);
                        // let txData = tokenContract.methods.name().encodeABI();
                        // logger.info("txData=" + JSON.stringify(txData));

                        // txData = await tokenContract.methods.mint(
                        //                         '0x'+Buffer.from(uuidParse.parse(order['id'])).toString('hex'),
                        //                         datasetInfo['data_hash'],
                        //                         datasetInfo['data_compression'],
                        //                         order['data_loc_hash'], 
                        //                         datasetInfo['num_of_records'], //ipfs hash
                        //                         order['trade'], // settlement price
                        //                         order['pricing_unit'],
                        //                         url,
                        //                         seller_wallet
                        //                 ).encodeABI();

                        // logger.info("txData=" + JSON.stringify(txData));

                        // let estimatedGas =  await tokenContract.methods.mint(
                        //                     '0x'+Buffer.from(uuidParse.parse(order['id'])).toString('hex'),
                        //                     datasetInfo['data_hash'],
                        //                     datasetInfo['data_compression'],
                        //                     order['data_loc_hash'], 
                        //                     datasetInfo['num_of_records'], //ipfs hash
                        //                     order['trade'], // settlement price
                        //                     order['pricing_unit'],
                        //                     url,
                        //                     seller_wallet
                        //             ).estimateGas({from: OPERATOR_ADDR});

                        // logger.info("estimated gas = " + estimatedGas);
        
                        // // Build the transaction
                        // logger.info("contract address=" + CONTRACT_ADDR);
                        // const txObject = {
                        //     gasPrice:  w3.utils.toHex(w3.utils.toWei('3','gwei')),
                        //     gasLimit:  w3.utils.toHex(700000),
                        //     to: CONTRACT_ADDR,
                        //     data: txData, 
                        //     value: w3.utils.toHex(w3.utils.toWei('0','ether')),
                        //     from: OPERATOR_ADDR,
                        //     nonce: '0x' + nonce + 1
                        // };
                        // logger.info ("tx object: " + JSON.stringify(txObject));
                        
                        // const tx = new Transaction(txObject,  {'chain':'rinkeby', hardfork: 'constantinople'});
                        // const keySearch = await vault.read('secret/cryptooperator');

                        // pk = Buffer.from(keySearch.data['pk'], 'hex');
                        // // Sign the transaction
                        // await tx.sign(pk);
                        // logger.info('tx signed');    

                        // const serializedTx = await tx.serialize();
                        // const raw = '0x' + serializedTx.toString('hex');
            
                        // logger.info('raw tx = ' + raw);

                        // if (
                        //     tx.validate() &&
                        //     bufferToHex(tx.getSenderAddress()) === bufferToHex(privateToAddress(pk))
                        //   ) {
                        //     logger.info('Valid signature');
                    
                        //   } else {
                        //     logger.info('Invalid signature');
                        //     return; 
                        //   }
                            
                        // // Broadcast the transaction

                        // logger.info("send transaction");
                        // w3.eth.sendSignedTransaction(raw).once( 'transactionHash', (hash) => {
                        //     console.log(hash)
                        //   }).on('receipt', (receipt) => {
                        //     console.log('receipt');
                        //   }).on('confirmation', (confirmationNumber, receipt) => {
                        //     console.log('confirmation');
                        //   }).on('error', (err) => {
                        //     console.log(err);
                        //   }).then( (receipt) => {
                        //     console.log('finally got the receipt!');
                        //   })
                        //   .catch(e => {
                        //     console.log('err');
                        //   })
                        // let receipt = await w3.eth.sendSignedTransaction(raw);
                        // let receipt = await w3.eth.sendSignedTransaction(raw);
                        // order['blockchain_tx_id'] = receipt;
                        // logger.info("transaction receipt =" + order['blockchain_tx_id']);

                    }
                } catch (err) {
                    console.log(err);
                    logger.info(err);
            }
        });
        }
    }
}