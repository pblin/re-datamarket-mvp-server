import {Db} from '../../db/Db';
import {DATA_HOST_URL} from '../../config/ConfigEnv';
import {GraphQLClient} from 'graphql-request';
const fetch = require('request-promise');

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
parameters \
country \
state_province \
price_low \
price_high \
pricing_unit \
table_name \
sample_hash \
data_hash \
data_compression \
json_schema \
date_created \
date_modified \
sample_access_url \
enc_sample_key \
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
        console.log(variables);
    
        let data = await this.client.request(mut, variables);
        console.log(data)
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
    
        let variables = {
            objects: []
        };
        let schemaItems = schema;
    
        for (var i = 0; i < schemaItems.length; i++) {
            if (schemaItems[i].label === undefined) {
                schemaItems[i].label = schemaItems[i].name.replace("_", " ").toLowerCase();
            }
            // console.log(schemaItems[i]);
            const item = {
                    field_name:schemaItems[i].name,
                    description:schemaItems[i].description.toLowerCase(),
                    field_label:schemaItems[i].label,
                    field_type:schemaItems[i].type,
                    region: region,
                    country: country,
                    search_terms:search_terms,
                    source_id:ds_id,
                };

            variables.objects.push(item);
        }
   
        let data = await this.client.request(mut, variables);
        // console.log(data);

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

        console.log(variables);
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
        console.log (query);
        console.log (variables);
        
        let data; 
        try {
            data  = await this.client.request(query, variables);
        } 
        catch (err) {
            console.log(err);
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
        console.log(query);
        console.log(variables);
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
        console.log(response);
        console.log(JSON.stringify(response));
        return response;
    }
}
