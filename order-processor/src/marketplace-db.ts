import {Db} from './db/Db';
import {GraphQLClient} from 'graphql-request';

const mktDsCols = 
"id \
name \
description \
delivery_method \
access_url \
num_of_records \
search_terms \
parameters \
country \
state_province \
price_low \
price_high \
pricing_unit \
sample_hash \
data_hash \
data_compression \
json_schema \
date_created \
date_modified \
sample_access_url \
dataset_owner_id";

export interface OrderDetail {
    id: string,
    dataset_id: number,
    buyer_id: number,
    seller_id: number,
    bid: number,
    offer: number,
    trade: number,
    pricing_unit: string,
    order_status: number,
    blockchain_tx_id: string,
    buyer_wallet_addr: string,
    seller_wallet_addr: string,
    seller_email: string,
    data_loc_hash: string,
    data_hash:string,
    data_compression: string,
    order_timestamp: string,
    dataset_name: string,
    dataset_description: string,
    num_of_records: number,
    access_url: string,
    payment_txn_ref: string,

    settlement_txn_timestamp: string

};

export interface OrderLog {
    id: string,
    dataset_id: number,
    dataset_description: string,
    dataset_name: string,
    buyer_id: number,
    seller_id: number,
    bid: number,
    offer: number,
    trade: number,
    order_status: number,
    payment_txn_ref: string,
    buyer_wallet_addr: string,
    seller_wallet_addr: string,
    data_loc_hash: string,
    order_timestamp: string,
    pricing_unit: string,
    settlement_txn_timestamp: string
    blockchain_tx_id: string,
};

const profileCols = 
    "id \
    primary_email \
    wallet_address_1 \
    wallet_address_2 ";

const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new (winston.transports.DailyRotateFile)({
    filename: 'db-%DATE%.log',
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
  
  
export class MarketplaceDB {
    client: GraphQLClient;
    constructor() {
        this.client = Db.getInstance().client;
    }

    async getDataSet (id: string ) {
        const query =  `query datasets ($id: String ) {
            marketplace_data_source_detail 
                  (where:{id:{ _eq: $id}})
           {
               ${mktDsCols}
           }
         }`
        let variables = {
            id
        }
        // console.log(query);
        // console.log(variables);
        try { 
                let data = await this.client.request(query, variables);
                if ( data ['marketplace_data_source_detail'] !== undefined && 
                    data['marketplace_data_source_detail'].length > 0 ) {
                    let datasetInfo = data ['marketplace_data_source_detail'][0];
                    // console.log(datasetInfo);
                    return datasetInfo;
                } else {
                    return null; 
                }
         } catch (err) {
             logger.error( err);
         }
      }
      async getProfileWithId(id: number) {
        const query = `query customer ($id: Int) {
          marketplace_customer (where:{id :{ _eq : $id}})
          {
            ${profileCols}
          }
        }`;
        const variables = {
             id
        };

        let result = await this.client.request (query, variables);
        logger.info(result['marketplace_customer'][0]);
        return result['marketplace_customer'][0];
    }
    
      async saveOrder (order:OrderDetail) {
        const mut = `mutation upsert_marketplace_order_book
                      ($objects:[marketplace_order_book_insert_input!]!) { 
                          insert_marketplace_order_book ( 
                          objects:$objects,
                          on_conflict: { 
                          constraint: order_book_pkey
                          update_columns: [ 
                                id,
                                dataset_id,
                                dataset_description,
                                dataset_name,
                                buyer_id,
                                seller_id,
                                bid,
                                offer,
                                trade,
                                order_status,
                                payment_txn_ref,
                                buyer_wallet_addr,
                                seller_wallet_addr,
                                data_loc_hash,
                                order_timestamp,
                                pricing_unit,
                                settlement_txn_timestamp,
                                blockchain_tx_id
                            ] 
                          }
                          ) {
                              affected_rows
                          }
                       }`
        let variables = {
          objects: []
        }; 
        
        let current_date = new Date();
        let order_log:OrderLog = {
            id: order.id,
            dataset_id: order.dataset_id,
            dataset_description: order.dataset_description,
            dataset_name: order.dataset_name,
            buyer_id: order.buyer_id,
            seller_id: order.seller_id,
            bid: order.bid,
            offer: order.offer,
            trade: order.trade,
            order_status: order.order_status,
            payment_txn_ref: order.payment_txn_ref,
            buyer_wallet_addr: order.buyer_wallet_addr,
            seller_wallet_addr: order.buyer_wallet_addr,
            data_loc_hash: order.data_loc_hash,
            order_timestamp: order.order_timestamp,
            pricing_unit: order.pricing_unit,
            settlement_txn_timestamp: current_date.toDateString(),
            blockchain_tx_id: order.blockchain_tx_id,
        };

        variables.objects.push(order_log);
        // console.log(mut);
        // console.log(variables);
        logger.info(JSON.stringify(variables));
        try { 
            let data = await this.client.request(mut, variables);
            return (data['insert_marketplace_order_book'].affected_rows);
         } catch (err) {
             logger.error(err);
         }
    }
}