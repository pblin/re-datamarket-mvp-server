import {Db} from '../../db/Db';
import {GraphQLClient} from 'graphql-request';

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
            update_columns: [ 
                id,
                name,
                description,
                delivery_method,
                access_url,
                api_key,
                enc_data_key,
                num_of_records,
                search_terms,
                parameters,
                country,
                state_province,
                dataset_owner_id,
                price_low,
                price_high,
                json_schema,
                stage,
                table_name,
                date_created,
                date_modified
            ] 
            }
            ) {
            affected_rows
            }
        }`;
        let variables = {
            objects: []
            }; 
        
        let obj = {}
        if  (ds['json_schema'] != null) {
            let schema = JSON.parse(ds['json_schema']);
            obj['table_name'] = schema.schema_name;
        }
        for (const key of Object.keys(ds)) {
            if (ds[key] != null) {
                obj[key] = ds[key]
            }
        }
        variables.objects.push(obj);
        console.log(variables);
    
        let data = await this.client.request(mut, variables);
        // @ts-ignore
        if (data !== undefined) {
            return data['insert_marketplace_data_source_detail'].affected_rows;
        } else return -1; 
    }
    async extractAndSaveDataFields (schema:any, dsId:string, search_terms:string, region:string, country:string) {
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
        let schemaItems = schema.fields;
    
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
            source_id:dsId,
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
        }

        let data = await this.client.request(mut, variables);

        if (data !== undefined ) {
            return data['delete_marketplace_source_of_field'].affected_rows;
        } else {
            return -1; 
        }
    }
    async deleteSchema (id: String) {

        const mu = `mutation delete_schema ($id: String ) {
            delete_marketplace_data_source_detail (
            where: {id: {_eq: $id}}
            ) {
            affected_rows
            }
        }`
        let variables = {
            id
        }
        console.log(variables);
        let data = await this.client.request(mu, variables);
        console.log(data);

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
                            id,
                            name,
                            description,
                            delivery_method,
                            access_url,
                            api_key,
                            enc_data_key,
                            num_of_records,
                            search_terms,
                            parameters,
                            country,
                            state_province,
                            price_low,
                            price_high,
                            table_name, 
                            data_hash,
                            sample_hash,
                            json_schema,
                            stage,
                            date_created,
                            date_modified,
                        }
                        }`
            variables = {
                owner_id,
                stage
            }
        } else {
            query =  `query datasets ($owner_id: Int ) {
                marketplace_data_source_detail 
                      (where:{dataset_owner_id:{ _eq: $owner_id}})
               {
                   id,
                   name,
                   description,
                   delivery_method,
                   access_url,
                   api_key,
                   enc_data_key,
                   num_of_records,
                   search_terms,
                   parameters,
                   country,
                   state_province,
                   price_low,
                   price_high,
                   table_name, 
                   data_hash,
                   sample_hash,
                   json_schema,
                   stage,
                   date_created,
                   date_modified
               }
             }`

            variables = {
                owner_id
            }
        }
        console.log (query);
        console.log (variables);
        
        let data = await this.client.request(query, variables);
        
        if ( data ['marketplace_data_source_detail'] !== undefined ) {
            return data ['marketplace_data_source_detail'];
        } else {
            return -1; 
        }
    }
    async getAdataset (id: string, userId:number) {
        const query =  `query datasets ($id: String ) {
            marketplace_data_source_detail 
                  (where:{id:{ _eq: $id}})
           {
               id,
               name,
               description,
               delivery_method,
               access_url,
               api_key,
               enc_data_key,
               num_of_records,
               search_terms,
               parameters,
               country,
               state_province,
               price_low,
               price_high,
               table_name,
               sample_hash,
               data_hash,
               json_schema,
               date_created,
               date_modified,
               dataset_owner_id
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
            if (userId != 0 && userId != datasetInfo.dataset_owner_id) {
                delete datasetInfo["api_key"];
                delete datasetInfo["enc_data_key"];
                //delete datasetInfo["dataset_owner_id"];
            }
            // console.log(datasetInfo);
            return datasetInfo;
        } else {
            return -1; 
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
        console.log(data);
        if ( data ['marketplace_field'] !== undefined ) {
            let typeInfo = data ['marketplace_field'];
            return typeInfo;
        } else {
            return -1; 
        }
    }
}
