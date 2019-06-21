import {Db} from '../../db/Db';
import {DATA_HOST_URL} from '../../config/ConfigEnv';
import {GraphQLClient} from 'graphql-request';
const fetch = require('request-promise');
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();
const fuzz = require('fuzzball');

const dsCols = 
"id \
name \
description \
delivery_method \
access_url \
api_key \
enc_data_key \
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
table_name \
sample_hash \
data_hash \
data_compression \
json_schema \
schema \
date_created \
date_modified \
sample_access_url \
enc_sample_key \
stage \
dataset_owner_id";

export class SchemaService {
    client: GraphQLClient;
    constructor() {
        this.client = Db.getInstance().client;
    }
    async saveDataset (ds:any) {
        const mut = `
            mutation upsert_marketplace_data_source_detail 
            ($objects:[marketplace_data_source_detail_insert_input!]!) { 
                insert_marketplace_data_source_detail ( 
                objects:$objects,
                on_conflict: { 
                    constraint: data_source_detail_pkey
                    update_columns: [ ${dsCols} ] 
                    }
                ) {
                    affected_rows
                }
            }`;
        let variables = {
            objects: []
            }; 
        
        let obj = {};
        for (const key of Object.keys(ds)) {
            if (ds[key] != null) {
                obj[key] = ds[key]
            }
        }
        variables.objects.push(obj);
        // console.log(mut);
        // console.log(variables);
    
        let data = await this.client.request(mut, variables);
        logger.info(data)
        if (data !== undefined) {
            return data['insert_marketplace_data_source_detail'].affected_rows;
        } else
            return  -1; 
    }
    async extractAndSaveDataFields (schema:any, ds_id:string, search_terms:string, region:string, country:string) {
        const mut = `
            mutation insert_marketplace_source_of_field($objects:[marketplace_source_of_field_insert_input!]!)
            {
            insert_marketplace_source_of_field ( 
                objects:$objects,
                on_conflict: { 
                    constraint: source_of_field_pkey
                    update_columns: [ 
                        field_name
                        field_label
                        description
                        field_type
                        region
                        country
                        search_terms
                        source_id
                    ] 
            } ) {
                    affected_rows
                }
            }`;
        // console.log(mut);

        let variables = {
            objects: []
        };

        // console.log(schema.length);
        for (var i = 0; i < schema.length; i++) {
            if (schema[i].label === undefined) {
                schema[i].label = schema[i].name.replace("_", " ").toLowerCase();
            }
            const item = {
                    field_name:schema[i].name,
                    description:schema[i].description.toLowerCase(),
                    field_label:schema[i].label,
                    field_type:schema[i].type,
                    region: region,
                    country: country,
                    search_terms:search_terms,
                    source_id:ds_id,
                };

            variables.objects.push(item);
        }
       // console.log(variables);

        let data = await this.client.request(mut, variables);
        logger.info(data);

        if (data !== undefined ) {
            return data['insert_marketplace_source_of_field'].affected_rows;
        } else {
            return -1; 
        }
    }
    async deletePriorSavedFields (dataset_id: string) {
        const mut = `mutation delete_data_fields ($dataset_id: String ) {
            delete_marketplace_source_of_field (
            where: {source_id: { _eq: $dataset_id} }
            ) {
                affected_rows
            }
        }`;

        let variables = {
            dataset_id
        };

        let data = await this.client.request(mut, variables);
        logger.info(data);
        if (data !== undefined ) {
            return data['delete_marketplace_source_of_field'].affected_rows;
        } else {
            return -1; 
        }
    }

    async deleteSchema (id: string) {
        const mu = `mutation delete_schema ($id: String ) {
            delete_marketplace_data_source_detail (
            where: {id: {_eq: $id}}
            ) {
                affected_rows
            }
        }`
        let variables = {
            id
        };

        logger.info(variables);
        let data = await this.client.request(mu, variables);
        // console.log(data);

        if ( data ['delete_marketplace_data_source_detail'] !== undefined ) {
            return data ['delete_marketplace_data_source_detail'].affected_rows;
        } else {
            return -1; 
        }
    }

    async getAllDatasetsOfUser (owner_id: number, stage: number) {
        let query;
        let variables;

        if (stage > 0 ) {
            query =`query datasets ($owner_id: Int, $stage: Int ) {
                        marketplace_data_source_detail 
                            (where: { _and:
                                        [ 
                                            {dataset_owner_id:{ _eq: $owner_id}},
                                            {stage: {_eq: $stage}}
                                        ]
                                    }
                            )
                        {
                            ${dsCols}
                        }
                        }`;

            variables = {
                owner_id,
                stage
            };
        } else { //query all stages
            query =  `query datasets ($owner_id: Int ) {
                marketplace_data_source_detail 
                      (where:{dataset_owner_id:{ _eq: $owner_id}})
               {
                   ${dsCols}
               }
             }`

            variables = {
                owner_id
            }
        }
        // console.log (query);
        // console.log (variables);
        
        let data; 
        try {
            data  = await this.client.request(query, variables);
        } 
        catch (err) {
            logger.error(err);
            return -1;
        }
        
        if ( data ['marketplace_data_source_detail'] !== undefined ) {
            return data ['marketplace_data_source_detail'];
        } else {
            return null; 
        }
    }
    async getAdataset (id: string, user_id:number) {
        const query =  `query datasets ($id: String ) {
            marketplace_data_source_detail 
                  (where:{id:{ _eq: $id}})
           {
               ${dsCols}
           }
         }`
        let variables = {
            id
        }
        // logger.info(query);
        // logger.info(variables);
        let data = await this.client.request(query, variables);
 
        if ( data ['marketplace_data_source_detail'] !== undefined && 
             data['marketplace_data_source_detail'].length > 0 ) {
            let datasetInfo = data ['marketplace_data_source_detail'][0];
            // remove non-owner view info
            // console.log (userId);
            // userID == 0 is the special case for returning dataset right after saved
            if (user_id != 0 && user_id != datasetInfo.dataset_owner_id) {
                    delete datasetInfo["api_key"];
                    delete datasetInfo["enc_data_key"];
                    //delete datasetInfo["enc_sample_key"];
                    //delete datasetInfo["dataset_owner_id"];
            }
            // console.log(datasetInfo);
            return datasetInfo;
        } else {
            return null; 
        }
    }
    async getAvailableTypes () {
        const query =  `query  {
            marketplace_field (distinct_on: [type] )
  	        { 
  		        type
            }
        }`
        let data = await this.client.request(query);
        // console.log(data);
        if ( data ['marketplace_field'] !== undefined ) {
            let typeInfo = data ['marketplace_field'];
            return typeInfo;
        } else {
            return null; 
        }
    }
    async getAvailableTopics () {
        const query =  `query  {
            marketplace_topic (distinct_on: [name] )
  	        { 
                  name
                  description
            }
        }`
        let data = await this.client.request(query);
        // console.log(data);
        if ( data ['marketplace_topic'] !== undefined ) {
            let topicInfo = data ['marketplace_topic'];
            return topicInfo;
        } else {
            return null; 
        }
    }

    async previewSample(id: string) {
        let datasetInfo = await this.getAdataset(id, 0);
        let parts = datasetInfo['sample_access_url'].split('/'); 
        let file_hash = parts.pop() || parts.pop();
        const url = DATA_HOST_URL + '/' + datasetInfo['enc_sample_key'] + '/' + file_hash;
        console.log(url);
        const options ={
            uri: url,
            method: 'GET',
            rejectUnauthorized: false
        };

        let response = await fetch(options);
        // console.log(response);
        // console.log(JSON.stringify(response));
        return response;
    }
    async searchDataset(fields:string,topics:string,cities:string,state:string,country:string) {
        let query = `
                query {
                    marketplace_search_dataset_schema ( 
                        args: { 
                            fields: "${fields}", 
                            topics: "${topics}", 
                            cities: "${cities}", 
                            region:  "${state}",
                            ctn: "${country}"
                        }
                    ) {
                        dataset_id
                        dataset_name
                        field_name
                        field_type
                        field_label
                        field_description
                    }
                }` 
        logger.info (query);
        let data = await this.client.request(query);

        if ( data ['marketplace_search_dataset_schema'] !== undefined ) {
            return data['marketplace_search_dataset_schema'];
        } else {
            return null; 
        }
    }

    // async getDataFields(country:string, region:string, terms:string) {
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
                
    //         query = `query get_source_details ($objects:[String]) {
    //             marketplace_data_source_detail (
    //             where: { id: {_in: $objects} }
    //             ){
    //             ${dsCols}
    //             }
    //         }`
    //         variables = {
    //             objects: hitList
    //             }
    //         logger.info(`hist list = ( ${hitList} )`);
    //         data = await this.client.request(query,variables);
            
    //         if (data['marketplace_data_source_detail'] !== undefined ) {
    //             return data['marketplace_data_source_detail'];
    //         } else {
    //             return null;
    //         }
    // }

}
