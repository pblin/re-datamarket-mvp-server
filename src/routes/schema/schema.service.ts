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
                date_created,
                date_modified
            ] 
            }
            ) {
            affected_rows
            }
        }`;
    
        const variables = {
        objects: [
            {
            id: ds.id,
            name: ds.name,
            description: ds.description,
            delivery_method: ds.delivery_method,
            access_url: ds.access_url,
            api_key: ds.api_key,
            enc_data_key: ds.enc_data_key,
            num_of_records: ds.num_of_records,
            search_terms: ds.search_terms,
            parameters: ds.parameters,
            country: ds.country,
            state_province: ds.state_province,
            dataset_owner_id: ds.dataset_owner_id,
            price_low: ds.price_low,
            price_high: ds.price_high,
            stage: ds.stage,
            date_created: ds.date_created,
            date_modified: ds.date_modified,
            json_schema: ds.json_schema,
            }
        ]
        };
    
        let data = await this.client.request(mut, variables);
        // @ts-ignore
        if (data !== undefined) {
            return data['insert_marketplace_data_source_detail'].affected_rows;
        } else return -1; 
    }
  
    async extractAndSaveDataFields (schemaItems:any, dsId:string) {
        const mut = `
            mutation insert_marketplace_source_of_field($objects:[marketplace_source_of_field_insert_input!]!)
            {
            insert_marketplace_source_of_field ( 
                objects:$objects,
                on_conflict: { 
                    constraint: source_of_field_pkey
                    update_columns: [ 
                        field_name
                        description
                        field_type
                        source_id
                    ] 
            } ) {
                affected_rows
                }
            }`;
    
        let variables = {
            objects: []
        };
    
        for (var i = 0; i < schemaItems.length; i++) {
        const item = {
            field_name:schemaItems[i].name,
            description:schemaItems[i].description,
            field_type:schemaItems[i].type,
            source_id:dsId,
        };
        variables.objects.push(item);
        }
    
        let data = await this.client.request(mut, variables);
        
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
    async getAllDatasetsOfUser (owner_id: number) {
        const query =  `query datasets ($owner_id: Int ) {
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
               json_schema,
               stage,
               date_created,
               date_modified
           }
         }`
        let variables = {
            owner_id
        }

        let data = await this.client.request(query, variables);

        if (data !== undefined ) {
            return data ['marketplace_data_source_detail'];
        } else {
            return -1; 
        }
    }
}