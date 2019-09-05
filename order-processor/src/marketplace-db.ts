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
    data_loc_hash: string,
    order_timestamp: string,
    dataset_name: string,
    dataset_description: string,
    payment_txn_ref: string,
    settlement_txn_timestamp: string

};

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
        order.blockchain_tx_id = 'N/A';
        order.settlement_txn_timestamp = order.order_timestamp;
        variables.objects.push(order);
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