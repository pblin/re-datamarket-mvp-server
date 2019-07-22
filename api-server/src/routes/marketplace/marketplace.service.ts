import {Db} from '../../db/Db';
import {GraphQLClient} from 'graphql-request';
import * as Queue from 'bee-queue';
import { VAULT_SERVER, VAULT_CLIENT_TOKEN, REDIS_HOST, REDIS_PORT, 
         AZURE_TEXT_ANAL_KEY, AZURE_TEXT_ANALYTICS } from '../../config/ConfigEnv';

import * as uuidv4 from 'uuid/v4';
import { LogService } from '../../utils/logger';
// import { listenerCount } from 'cluster';
const logger = new LogService().getLogger();

const options = {
    apiVersion: 'v1', // default
    endpoint: VAULT_SERVER, // default
    token:  VAULT_CLIENT_TOKEN // optional client token; 
  };
const vault = require("node-vault")(options);
const request = require('request-promise');

// const fuzz = require('fuzzball');
const mktDsCols = 
"id \
name \
description \
delivery_method \
access_url \
num_of_records \
search_terms \
topic \
parameters \
country \
state_province \
city \
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
stage \
asset_token_address \
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
            logger.error(err);
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
            logger.error(err);
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
   
    // filterCountry (toFilter:any,country:string) 
    // {
    //     for (let i=0; i < toFilter.length; i++)
    //         if (toFilter[i]['country'] != country)
    //             delete toFilter[i];
    // }

    // filterState (toFilter:any,state:string) 
    // {

    //     for (let i=0; i < toFilter.length; i++)
    //     if (toFilter[i]['state'] != state)
    //         delete toFilter[i];
    // }

    // filterCity (toFilter:any,cities:string) 
    // {
    //     let cityArray = cities.split(',');
    //     let i = 0;
    //     let match = false;
    //     for ( ;i < toFilter.length; i++) {
    //         for (let city in cityArray)
    //             match = match || toFilter[i]['city'].includes(city);

    //         if (!match)  // no match in any the cities
    //             delete toFilter[i];
    //         else  // found match reset for next item
    //             match = false; 
    //     }
    // }

    // filterTopic (toFilter:any,topics:string) 
    // {
    //     console.log('filter topic');
    //     let topicArray = topics.split(',');
    //     console.log(topicArray);
    //     let i = 0;
    //     let match = false;
    //     for ( ;i < toFilter.length; i++) {
    //         for (let j = 0; j < topicArray.length; j++) {
    //             let topic = topicArray[j];
    //             // console.log(topic);
    //             match = match || toFilter[i]['topic'].includes(topic);
    //         }

    //         if (!match)  // no match in any the topics
    //             delete toFilter[i];
    //         else  // found match reset for next item
    //             match = false; 
    //     }
    // }
    findIndex(items:any,name:string){
        let found = -1;
        for (let i=0; i < items.length; i++)
            if (name == items[i]['name']) {
                found = i;
                break;
            }
        return found;
    }
    cityGrouping(cities:any,topics:any,ci:number) {
        let city_array = [];
        for ( let k =0; k < cities.length; k++) {
            let topic_in_city = this.topicGrouping(topics, ci);
            city_array.push(
                { 
                    "name":cities[k],
                    "count": 1,
                    "datasetIndex":[ci],
                    "topic": topic_in_city
                }
            )
        }
        return city_array;
    }
    topicGrouping(topics:any,ci:number) {
        let topic_array = [];
        for (let i=0; i < topics.length; i++) {
            topic_array.push ({
                "name": topics[i],
                "count": 1,
                "datasetIndex": [ci]
            })
        }
        return topic_array;
    }
    geoFactsets (result:any) {
        let summary = {
                "country":[{  
                        "name": "united states",
                        "count": 0,
                        "datasetIndex": [],
                        "region": [{   
                                "name": "new york",
                                "count": 0,
                                "datasetIndex": [],
                                "city": [{ 
                                    "name": "new york",
                                    "count": 0,
                                    "datasetIndex":[],
                                    "topic":[]
                                    }]
                                }]
                    }]
            };

        try {
            for (let j=0; j < result.length; j++) {
                let item = result[j];
                // console.log(item);
                // country
                let i = this.findIndex(summary.country,item['country']);

                if (i  < 0) { // initial country entry
                    let cities = this.cityGrouping(item['city'], item['topic'], j);
                    summary.country.push(
                        {
                            "name":item['country'],
                            "count": 1,
                            "datasetIndex":[j],
                            "region": [{
                                        "name": item['state_province'],
                                        "count": 1,
                                        "city": cities,
                                        "datasetIndex": [j]
                                    }]
                        });
                } 
                else { // tally country
                    summary.country[i].count += 1;
                    summary.country[i]['datasetIndex'].push(j);
                    // console.log(JSON.stringify(summary.country[i]));
                    let ii  = this.findIndex(summary.country[i]['region'], item['state_province']);

                    if (ii < 0) { //initial state entry
                        let cities = this.cityGrouping(item['city'],item['topic'],j);
                        summary.country[i].region.push(
                                {
                                    "name": item['state_province'],
                                    "count": 1,
                                    "city": cities,
                                    "datasetIndex":[j]
                                });
                    } else { // tally state
                        // console.log(JSON.stringify(summary.country[i].region[ii]));
                        summary.country[i].region[ii].count += 1;
                        summary.country[i].region[ii].datasetIndex.push(j);
                        for ( let k =0; k < item['city'].length; k++) {
                            let c = item['city'][k];
                            let iii = this.findIndex (summary.country[i].region[ii]['city'],c);
                            if (iii < 0 )  { // inital city entry
                                let topic_in_city = this.topicGrouping(item['topic'],j);
                                summary.country[i].region[ii].city.push (
                                    {
                                        "name":c,
                                        "count": 1,
                                        "datasetIndex":[j],
                                        "topic": topic_in_city
                                    });
                                }
                            else { 
                                summary.country[i].region[ii].city[iii].count += 1;
                                summary.country[i].region[ii].city[iii].datasetIndex.push(j)
                                // console.log(JSON.stringify(summary.country[i].region[ii].city[iii]));

                                for (let ti=0; ti < item['topic'].length; ti++) {
                                    let t =  item['topic'][ti];
                                    let x = this.findIndex(summary.country[i].region[ii].city[iii]['topic'],t);
                                    if ( x < 0) 
                                        summary.country[i].region[ii].city[iii].topic.push(
                                            {
                                                "name":t,
                                                "count":1,
                                                "datasetIndex":[j]
                                            });
                                    else {
                                        summary.country[i].region[ii].city[iii]['topic'][x].count += 1;
                                        summary.country[i].region[ii].city[iii]['topic'][x].datasetIndex.push(j);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.log(err);
        }

        if (summary.country[0].count == 0) // delete default entry if the count is 0
            delete summary.country[0];

        console.log(JSON.stringify(summary));
        return summary;
    }

    topicFactsets (result:any) {
        let summary = {
            topic:[]
        }
        try {
            for (let j=0; j < result.length; j++) {
                let item = result[j];
                let i = -1;
                // topic is an array in result 
                for ( let k=0; k < item['topic'].length; k++) {
                    let t = item['topic'][k];
                    if (summary.topic.length == 0 && t != null && t != '' )
                        summary.topic.push(
                            {
                                "name": t,
                                "count": 1,
                                "datasetIndex": [j]
                            });
                    else {
                        i = this.findIndex(summary.topic,t);
                        if ( i  >= 0) {
                            summary.topic[i]['count'] += 1;
                            summary.topic[i]['datasetIndex'].push(j);
                        }
                        else 
                            summary.topic.push(
                                    {
                                        "name": t,
                                        "count": 1,
                                        "datasetIndex": [j]
                                    });
                        }
                    }
                }
             } catch (err) {
                console.log(err);
             }
        console.log(JSON.stringify(summary));
        return summary;
    }
    async processSearchTerms(terms:string) {
        const entities_api_loc = AZURE_TEXT_ANALYTICS + '/entities';
        const phrase_api_loc = AZURE_TEXT_ANALYTICS + '/KeyPhrases';
       
        let new_terms = terms.replace(/,/g, ' ');

        let payload = {
             "documents": [ 
                {
                    "id": "1",
                    "language": "en",
                    "text": new_terms
                }]
            };

        let options = {
            method: 'POST',
            headers: {
                'Content-Type':'application/json',
                'Ocp-Apim-Subscription-Key': AZURE_TEXT_ANAL_KEY,
                'Accept':'application/json'
            },
            body: JSON.stringify(payload)
        };
        // console.log("input:"+new_terms);
        try {
            logger.info(entities_api_loc);
            logger.info(options);
            let response = await request(entities_api_loc,options);
            logger.info(response);
            let data = JSON.parse(response);
            let token = data['documents'][0]['entities'];
            logger.info("entities:" + token);

            let terms_for_key_phrases;

            for (let i=0; i<token.length; i++) {
                    let inject = token[i]['name'].replace(/ /g,'<1>');
                    logger.info("entities inject->"+inject);
                    let re = new RegExp(token[i]['name'], 'g');
                    new_terms = new_terms.replace(re, inject);
                    re = new RegExp(inject, 'g');
                    terms_for_key_phrases = new_terms.replace(re,''); // take out known entities
                    logger.info("to be check for key phrases:" + terms_for_key_phrases);
                }
            if (token.length == 0)
                terms_for_key_phrases = new_terms;

            logger.info(phrase_api_loc);
            payload.documents[0].text = terms_for_key_phrases;
            options.body = JSON.stringify(payload);
            logger.info(options);
            response = await request(phrase_api_loc,options);
            logger.info(response);
            data = JSON.parse(response);
            token = data['documents'][0]['keyPhrases'];
            logger.info("key phrases:" + token);
          
            for (let i=0; i<token.length; i++) {
                let inject = token[i].replace(/ /g,'<1>');
                logger.info("inject->"+inject);
                let re = new RegExp(token[i], 'g');
                new_terms = new_terms.replace(re,inject);
                logger.info(new_terms);
            }

            new_terms = new_terms.trim();
            new_terms = new_terms.replace(/ /g,'&');
            console.log("post process terms:" + new_terms);
            logger.info("post processed terms:" + new_terms);

         } catch (err) {
            logger.error(err)
        }
        return new_terms;
    }
    async searchDataset (topics:string,
                         terms:string,
                         cities:string,
                         state:string,
                         country:string,
                         purchased_by:number,
                         op:string) {
        
                            
        let tokenized_terms = await this.processSearchTerms(terms);
        const query =  
            `query {
                        marketplace_search_dataset ( 
                            args: { 
                                topics: "${topics}", 
                                terms: "${tokenized_terms}", 
                                cities: "${cities}", 
                                region: "${state}",
                                cn: "${country}",
                                purchased_by: ${purchased_by}
                            }
                        )
                    {
                        ${mktDsCols}
                    }
            }`
        logger.info(query);
        let data = await this.client.request(query);

        if ( data['marketplace_search_dataset'] !== undefined ) {
            let result = data['marketplace_search_dataset'];
            let response = {
                "geoFactsets": null,
                "topicFactsets":null,
                "datasets": result
            };
            if (result.length > 0) {
                 response.geoFactsets = this.geoFactsets(result);
                 response.topicFactsets = this.topicFactsets(result);
            }
            return response; 

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
            logger.info('queue now ready to start doing things');
        });

        this.queue.on('error', (err) => {
            logger.error(`A queue error happened: ${err.message}`);
            return 'q_err';
        });
        
        let order_id = uuidv4();
        draft_order['id'] = order_id

        let job  = this.queue.createJob (draft_order);

        try { 
            job.save().then(( job) => { logger.info(`job = ${job}`) });
        } catch (err) {
            logger.error(err);
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

    // async  getDataFields(country:string, region:string, terms:string) { 
    //     let query =  `query data_fields ($country:String, $region: String) {
    //         marketplace_source_of_field (
    //           where: { _and:[ 
    //             				 {country: { _eq: $country}},
    //           					 {region: { _eq: $region}}
    //         				]
    //         		}
    //         	) 
    //         {
    //           source_id
    //           field_label
    //           search_terms
    //         }
    //       }`

    //     let variables = {};
    //     if ( country != '' && region != '') {
    //         variables = {
    //             country,
    //             region
    //         }
    //     } else {
    //         if (country != '') {
    //             variables = {
    //                 country
    //             }
    //         } else {
    //             if (region != '') {
    //                 variables = {
    //                     region
    //                  }
    //             }
    //         }
    //     }
    //     // console.log(variables);
    //     let data = await this.client.request(query,variables);
        
    //     let x = 0;
    //     let hitList = [];
    //     if ( data ['marketplace_source_of_field'] !== undefined ) {
    //         let objList = data ['marketplace_source_of_field'];
    //         // console.log(objList.length);
    //         for (var i = 0; i <  objList.length; i++ ) {
    //             let isTermClose = 0;
    //             let searchTermList = objList[i]['search_terms'];
    //             if (searchTermList != null) {
    //                 for (let j in searchTermList ) {
    //                     // console.log (searchTermList[j]);
    //                     if (fuzz.token_set_ratio(searchTermList[j],terms) > 60) {
    //                             isTermClose = 1; //found a match
    //                             break;
    //                         }
    //                     }
    //                 }
    //             if (fuzz.token_set_ratio(terms, objList[i]['field_label']) > 60 || isTermClose > 0 ) {
    //                     if ( hitList.indexOf(objList[i]['source_id']) == -1) {
    //                         hitList.push(objList[i]['source_id']);
    //                     }
    //                 }
    //             }
    //         }
        
    //     query = `query get_source_details ($objects:[String]) {
    //         marketplace_data_source_detail (
    //         where: { id: {_in: $objects} }
    //         ){
    //         ${mktDsCols}
    //         }
    //     }`
    //     variables = {
    //         objects: hitList
    //         }
    //     logger.info(`hist list = ( ${hitList} )`);
    //     data = await this.client.request(query,variables);
        
    //     if (data['marketplace_data_source_detail'] !== undefined ) {
    //         return data['marketplace_data_source_detail'];
    //     } else {
    //         return null;
    //     }
    // }
}