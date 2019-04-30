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
    order_status: number,
    chain_tx_id: string,
    buyer_wallet_addr: string,
    seller_wallet_addr: string,
    data_loc_hash: string,
    data_hash: string,
    data_hash_type: string,
    data_content_type: string,
    enc_data_key: string,
    order_timestamp: string
};

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
        let data = await this.client.request(query, variables);
    
        if ( data ['marketplace_data_source_detail'] !== undefined && 
             data['marketplace_data_source_detail'].length > 0 ) {
            let datasetInfo = data ['marketplace_data_source_detail'][0];
            // console.log(datasetInfo);
            return datasetInfo;
        } else {
            return null; 
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
                                settlement_txn_timestamp
                            ] 
                          }
                          ) {
                              affected_rows
                          }
                       }`
        let variables = {
          objects: []
        }; 
        variables.objects.push(order);
        // console.log(variables);
        let data = await this.client.request(mut, variables);
        return (data['order_book']);
    }
}