import {Db} from '../../db/Db';
import {GraphQLClient} from 'graphql-request';
import * as Queue from 'bee-queue';
import { VAULT_SERVER, VAULT_CLIENT_TOKEN, REDIS_HOST, REDIS_PORT } from '../../config/ConfigEnv';
import * as uuidv4 from 'uuid/v4';

const options = {
    apiVersion: 'v1', // default
    endpoint: VAULT_SERVER, // default
    token:  VAULT_CLIENT_TOKEN // optional client token; 
  };
const vault = require("node-vault")(options);

let fuzz = require('fuzzball');

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

export class MarketplaceService {
    client: GraphQLClient;
    queue: Queue;
    constructor() {
        this.client = Db.getInstance().client;
    }
    async connectToJobQueue() {
        let result;
        try { 
            result = await vault.read('secret/azureredis');
        } 
        catch (err) {
            console.log(err);
            return (0);
        }
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
                    auth_pass: result.data['skey'], 
                    tls: {servername: REDIS_HOST},
                    options: {}
                },
                isWorker: false,
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
            console.log(err);
            return (0);
        }
        return (1);
    }
    async getAllDatasets () {
        const query =  `query  {
            marketplace_data_source_detail ( where: {stage: {_eq: 3 }})
           {
                ${mktDsCols}
            }
        }`
        // console.log (query);
        let data = await this.client.request(query);
   
        if ( data ['marketplace_data_source_detail'] !== undefined ) {
            return data ['marketplace_data_source_detail'];
        } else {
            return null; 
        }
    }
    async getDataFields(country:string, region:string, terms:string) {
        let query =  `query data_fields ($country:String, $region: String) {
            marketplace_source_of_field (
              where: { _and:[ 
                				 {country: { _eq: $country}},
              					 {region: { _eq: $region}}
            				]
            		}
            	) 
            {
              source_id
              field_label
              search_terms
            }
          }`

        let variables = {};
        if ( country != '' && region != '') {
            variables = {
                country,
                region
            }
        } else {
            if (country != '') {
                variables = {
                    country
                }
            } else {
                if (region != '') {
                    variables = {
                        region
                     }
                }
            }
        }
        console.log(variables);
        let data = await this.client.request(query,variables);
        
        let x = 0;
        let hitList = [];
        if ( data ['marketplace_source_of_field'] !== undefined ) {
            let objList = data ['marketplace_source_of_field'];
            console.log(objList.length);
            for (var i = 0; i <  objList.length; i++ ) {
                let isTermClose = 0;
                let searchTermList = objList[i]['search_terms'];
                if (searchTermList != null) {
                    for (let j in searchTermList ) {
                        // console.log (searchTermList[j]);
                        if (fuzz.token_set_ratio(searchTermList[j],terms) > 60) {
                                isTermClose = 1; //found a match
                                break;
                            }
                        }
                    }
                if (fuzz.token_set_ratio(terms, objList[i]['field_label']) > 60 || isTermClose > 0 ) {
                        if ( hitList.indexOf(objList[i]['source_id']) == -1) {
                            hitList.push(objList[i]['source_id']);
                        }
                    }
                }
            }
        
    query = `query get_source_details ($objects:[String]) {
        marketplace_data_source_detail (
          where: { id: {_in: $objects} }
        ){
          ${mktDsCols}
        }
      }`
      variables = {
          objects: hitList
        }
      console.log(hitList);
      data = await this.client.request(query,variables);
      
      if (data['marketplace_data_source_detail'] !== undefined ) {
          return data['marketplace_data_source_detail'];
      } else {
          return null;
      }
    }
    async getAdataset (id: string) {
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
        let data = await this.client.request(query, variables);

        if ( data ['marketplace_data_source_detail'] !== undefined ) {
            return data ['marketplace_data_source_detail'][0];
        } else {
            return null; 
        }
    }
    async submitOrder (draft_order: any) {
        // publish order message to a queue
        if (this.queue == null) {
                let status = await this.connectToJobQueue();
                if ( status == 0) 
                    return 'redis-err';
         }
    
        this.queue.on('ready', () => {
            console.log('queue now ready to start doing things');
        });

        this.queue.on('error', (err) => {
            console.log(`A queue error happened: ${err.message}`);
            return 'q_err';
        });
        
        let order_id = uuidv4();
        draft_order['id'] = order_id

        let job  = this.queue.createJob (draft_order);

        try { 
            job.save().then(( job) => { console.log(job)});
        } catch (err) {
            console.log(err);
            return 'redi-err';
        }
        return order_id;
    }

    async getUserOrders (userid: number) {
        const query =  
                `query order( $userid: Int ) {
                    marketplace_order_book ( 
                        where: {
                        _or: [
                                        {buyer_id: {_eq: $userid}}, 
                                        {seller_id: {_eq: $userid}}
                                        ]
                        }
                        )
                    {
                    id
                    buyer_id
                    buyer_wallet_addr
                    seller_id
                    seller_wallet_addr
                    dataset_id
                    dataset_name
                    dataset_description
                    data_loc_hash
                    payment_txn_ref
                    trade
                    pricing_unit
                    order_status
                    order_timestamp
                    settlement_txn_timestamp
                    }
                }`
        let variables = {
            userid
        }
        // console.log(query);
        // console.log(variables);
        let data = await this.client.request(query, variables);
     
        if ( data ['marketplace_order_book'] !== undefined ) {
            return data ['marketplace_order_book'];
        } else {
            return null; 
        }
    }
}