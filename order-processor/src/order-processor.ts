import * as Queue from 'bee-queue';
import {VAULT_SERVER,VAULT_CLIENT_TOKEN,REDIS_HOST,REDIS_PORT,
        CHAIN_IP,CONTRACT_ADDR,OPERATOR_ADDR} from './config/Env';
import {MarketplaceDB, OrderDetail} from './marketplace-db';
import * as Web3 from 'web3';
const loadJsonFile = require ('load-json-file');

const Tx = require('ethereumjs-tx');

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

const w3 = new Web3( new Web3.providers.HttpProvider(CHAIN_IP));

export class OrderProcessor {
    queue: Queue;
    async connectToJobQueue() {
        let result = await vault.read('secret/azureredis');
        this.queue = new Queue('orders', {
            prefix: 'bq',
            stallInterval: 5000,
            nearTermWindow: 1200000,
            delayedDebounce: 1000,
            redis: {
                host: REDIS_HOST,
                port: REDIS_PORT,
                db: 0,
                auth_pass: result.data['skey'], 
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
        return (1);
    }
    async process() {

        let contractJson  = await loadJsonFile('./src/abi/ReblocDatasetToken.json')
        let tokenContract = new w3.eth.Contract(contractJson['abi'], CONTRACT_ADDR);
        let pk;
        try {
            if (this.queue == null )  {
                let status = await this.connectToJobQueue();
                if (status == 0)
                    logger.error('redis error');
            }
            
            if (this.queue != null) { 

                this.queue.on('ready', () => {
                    logger.info('queue now ready to start doing things');
                });
        
                this.queue.on('error', (err) => {
                    logger.error(`A queue error happened: ${err.message}`);
                });
                let result = await vault.read('crypto/operator');
                pk = Buffer.from(result.data['pk'], 'hex');
                this.queue.process(async (job) => {
                    logger.info( `Processing job ${job.id}: ` + JSON.stringify(job.data));
                    
                    let marketplaceDB = new MarketplaceDB();
                    let datasetInfo = await marketplaceDB.getDataSet(job.data['dataset_id']);

                    if ( datasetInfo != null) {
                        let order:OrderDetail = {
                            ...job.data,
                            dataset_description: datasetInfo['description'],
                            dataset_name: datasetInfo['name'],
                            seller_id: datasetInfo['dataset_owner_id'],
                            
                        };
                        let url = datasetInfo['access_url'];
                        if  ( url != null) { 
                            //get ipfs hash fromr access url
                            let parts = url.split('/'); 
                            order['data_loc_hash'] = parts.pop() || parts.pop();
                        }
                        logger.info("minting a token:");
                        let nonce = await w3.eth.getTransactionCount(OPERATOR_ADDR, 'pending');
                        let txData= await tokenContract.methods.mint(
                                            order['id'],
                                            datasetInfo['data_hash'],
                                            datasetInfo['data_compression'],
                                            datasetInfo['num_of_records'],
                                            order['data_loc_hash'],  //ipfs hash
                                            order['trade'], // settlement price
                                            order['pricing_unit'],
                                            url
                                        );
                        txData = txData.encodeABI();
                        await w3.eth.getTransactionCount(OPERATOR_ADDR, (err, txCount) => {
                            // Build the transaction
                            const txObject = {
                                nonce:    w3.utils.toHex(txCount),
                                to:       CONTRACT_ADDR,
                                value:    w3.utils.toHex(w3.utils.toWei('0', 'ether')),
                                gasLimit: w3.utils.toHex(2100000),
                                gasPrice: w3.utils.toHex(w3.utils.toWei('6', 'gwei')),
                                data: txData  
                                }
                                // Sign the transaction
                            const tx = new Tx(txObject);
                            tx.sign(pk);
                            
                            const serializedTx = tx.serialize();
                            const raw = '0x' + serializedTx.toString('hex');
                            
                            // Broadcast the transaction
                            const transaction = w3.eth.sendSignedTransaction(raw, (err, tx) => {
                                order['blockchain_tx_id'] = tx;
                                logger.info(tx);
                            });
                        });
                            // save order to database
                        let result = await marketplaceDB.saveOrder(order);
                        logger.info(result);
                    }
                });
            }

         } catch (err) {
            logger.info*(err);
        }
    }
}