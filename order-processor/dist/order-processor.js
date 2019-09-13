"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Env_1 = require("./config/Env");
const marketplace_db_1 = require("./marketplace-db");
const Web3 = require("web3");
const uuidParse = require("uuid-parse");
const ethereumjs_tx_1 = require("ethereumjs-tx");
const ethereumjs_util_1 = require("ethereumjs-util");
const Queue = require('bee-queue');
const loadJsonFile = require('load-json-file');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const options = {
    apiVersion: 'v1',
    endpoint: Env_1.VAULT_SERVER,
    token: Env_1.VAULT_CLIENT_TOKEN // optional client token; 
};
// const vault = require('node-vault')(options);
const vault = require('node-vault')(options);
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
class OrderProcessor {
    async connectToJobQueue() {
        let result = await vault.read('secret/azureredis');
        this.queue = new Queue('orders', {
            prefix: 'bq',
            stallInterval: 5000,
            nearTermWindow: 1200000,
            delayedDebounce: 1000,
            redis: {
                host: Env_1.REDIS_HOST,
                port: Env_1.REDIS_PORT,
                db: 0,
                auth_pass: result.data['skey'],
                tls: { servername: Env_1.REDIS_HOST },
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
        logger.info("chain provider " + Env_1.CHAIN_IP);
        const w3 = new Web3(new Web3.providers.HttpProvider(Env_1.CHAIN_IP));
        // const w3 = new Web3(CHAIN_IP);
        let contractJson = await loadJsonFile('./src/abi/ReblocDatasetToken.json');
        // logger.info(contractJson['abi']);
        let tokenContract = new w3.eth.Contract(contractJson['abi'], Env_1.CONTRACT_ADDR, { from: Env_1.OPERATOR_ADDR, gasLimit: 3000000 });
        let pk;
        try {
            if (this.queue == null) {
                let status = await this.connectToJobQueue();
                if (status == 0)
                    logger.error('redis error');
            }
        }
        catch (err) {
            logger.info(err);
        }
        if (this.queue != null) {
            this.queue.on('ready', () => {
                logger.info('queue now ready to start doing things');
            });
            this.queue.on('error', (err) => {
                logger.error(`A queue error happened: ${err.message}`);
            });
            // let result = await vault.read('crypto/operator');
            this.queue.process(async (job) => {
                try {
                    logger.info(`Processing job ${job.id}: ` + JSON.stringify(job.data));
                    let marketplaceDB = new marketplace_db_1.MarketplaceDB();
                    let datasetInfo = await marketplaceDB.getDataSet(job.data['dataset_id']);
                    if (datasetInfo != null) {
                        let order = Object.assign({}, job.data, { dataset_description: datasetInfo['description'], dataset_name: datasetInfo['name'], seller_id: datasetInfo['dataset_owner_id'] });
                        let buyerProfileInfo = await marketplaceDB.getProfileWithId(order['buyer_id']);
                        let buyer_wallet = buyerProfileInfo['wallet_address_1'];
                        let sellerProfileInfo = await marketplaceDB.getProfileWithId(order['seller_id']);
                        let seller_wallet = sellerProfileInfo['wallet_address_1'];
                        logger.info("seller: " + seller_wallet);
                        logger.info("buyer: " + buyer_wallet);
                        let url = datasetInfo['access_url'];
                        if (url != null) {
                            //get ipfs hash fromr access url
                            let parts = url.split('/');
                            order['data_loc_hash'] = parts.pop() || parts.pop();
                        }
                        logger.info("minting a token:");
                        let nonce = await w3.eth.getTransactionCount(Env_1.OPERATOR_ADDR);
                        logger.info("nonce = " + nonce);
                        let txData = tokenContract.methods.name().encodeABI();
                        logger.info("txData=" + JSON.stringify(txData));
                        txData = await tokenContract.methods.mint('0x' + Buffer.from(uuidParse.parse(order['id'])).toString('hex'), datasetInfo['data_hash'], datasetInfo['data_compression'], order['data_loc_hash'], datasetInfo['num_of_records'], //ipfs hash
                        order['trade'], // settlement price
                        order['pricing_unit'], url, seller_wallet).encodeABI();
                        logger.info("txData=" + JSON.stringify(txData));
                        let estimatedGas = await tokenContract.methods.mint('0x' + Buffer.from(uuidParse.parse(order['id'])).toString('hex'), datasetInfo['data_hash'], datasetInfo['data_compression'], order['data_loc_hash'], datasetInfo['num_of_records'], //ipfs hash
                        order['trade'], // settlement price
                        order['pricing_unit'], url, seller_wallet).estimateGas({ from: Env_1.OPERATOR_ADDR });
                        logger.info("estimated gas = " + estimatedGas);
                        // Build the transaction
                        logger.info("contract address=" + Env_1.CONTRACT_ADDR);
                        const txObject = {
                            gasPrice: w3.utils.toHex(w3.utils.toWei('3', 'gwei')),
                            gasLimit: w3.utils.toHex(700000),
                            to: Env_1.CONTRACT_ADDR,
                            data: txData,
                            value: w3.utils.toHex(w3.utils.toWei('0', 'ether')),
                            from: Env_1.OPERATOR_ADDR,
                            nonce: '0x' + nonce + 2
                        };
                        logger.info("tx object: " + JSON.stringify(txObject));
                        const tx = new ethereumjs_tx_1.Transaction(txObject, { 'chain': 'rinkeby', hardfork: 'constantinople' });
                        const keySearch = await vault.read('secret/cryptooperator');
                        pk = Buffer.from(keySearch.data['pk'], 'hex');
                        // Sign the transaction
                        await tx.sign(pk);
                        logger.info('tx signed');
                        const serializedTx = await tx.serialize();
                        const raw = '0x' + serializedTx.toString('hex');
                        logger.info('raw tx = ' + raw);
                        if (tx.validate() &&
                            ethereumjs_util_1.bufferToHex(tx.getSenderAddress()) === ethereumjs_util_1.bufferToHex(ethereumjs_util_1.privateToAddress(pk))) {
                            logger.info('Valid signature');
                        }
                        else {
                            logger.info('Invalid signature');
                            return;
                        }
                        // Broadcast the transaction
                        logger.info("send transaction");
                        // let receipt = await w3.eth.sendSignedTransaction(raw);
                        let receipt = await w3.eth.sendSignedTransaction(raw);
                        order['blockchain_tx_id'] = receipt;
                        logger.info("transaction receipt =" + order['blockchain_tx_id']);
                    }
                }
                catch (err) {
                    console.log(err);
                    logger.info(err);
                }
            });
        }
    }
}
exports.OrderProcessor = OrderProcessor;
//# sourceMappingURL=order-processor.js.map