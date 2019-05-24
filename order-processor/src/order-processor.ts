import * as Queue from 'bee-queue';
import { VAULT_SERVER, VAULT_CLIENT_TOKEN, REDIS_HOST, REDIS_PORT } from './config/Env';
import {MarketplaceDB, OrderDetail} from './marketplace-db';
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
    queue: Queue;
    async connectToJobQueue() {
        let result;
        try { 
            result = await vault.read('secret/azureredis')

        } 
        catch (err) {
            logger.log ('error', "redis error " + err);
            return (0);
        }

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

            this.queue.process(async (job) => {
                logger.info( `Processing job ${job.id}: ` + JSON.stringify(job.data));
                
                let marketplaceDB = new MarketplaceDB();
                let datasetInfo = await marketplaceDB.getDataSet(job.data['dataset_id']);

                if ( datasetInfo != null) {
                    let order:OrderDetail = {
                        ...job.data,
                        dataset_description: datasetInfo['description'],
                        dataset_name: datasetInfo['name'],
                        seller_id: datasetInfo['dataset_owner_id']
                    };
                    let url = datasetInfo['access_url'];
                    if  ( url != null) { 
                        //get ipfs hash fromr access url
                        let parts = url.split('/'); 
                        order['data_loc_hash'] = parts.pop() || parts.pop();
                    }
                    try { 
                        let result = await marketplaceDB.saveOrder(order);
                        logger.info(result);
                    }catch (err) {
                        logger.error (err);
                    }
                }
            });
        }
    }
}