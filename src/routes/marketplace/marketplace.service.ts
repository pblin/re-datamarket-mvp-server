import {Db} from '../../db/Db';
import {GraphQLClient} from 'graphql-request';
let fuzz = require('fuzzball');
export class MarketplaceService {
    client: GraphQLClient;

    constructor() {
        this.client = Db.getInstance().client;
    }
    async getAllDatasets () {
        const query =  `query  {
            marketplace_data_source_detail ( where: {stage: {_eq: 3 }})
           {
                id,
                name,
                description,
                delivery_method,
                access_url,
                num_of_records,
                search_terms,
                parameters,
                country,
                state_province,
                price_low,
                price_high,
                data_hash,
                sample_hash, 
                json_schema,
                date_created,
                date_modified
            }
        }`

        let data = await this.client.request(query);
   
        if ( data ['marketplace_data_source_detail'] !== undefined ) {
            return data ['marketplace_data_source_detail'];
        } else {
            return -1; 
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
          id,
          name,
          description,
          delivery_method,
          access_url,
          num_of_records,
          search_terms,
          parameters,
          country,
          state_province,
          price_low,
          price_high,
          json_schema,
          sample_hash,
          data_hash,
          date_created,
          date_modified
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
          return -1;
      }
    }
    async getAdataset (id: string) {
        const query =  `query datasets ($id: String ) {
            marketplace_data_source_detail 
                  (where:{id:{ _eq: $id}})
           {
               id,
               name,
               description,
               delivery_method,
               access_url,
               num_of_records,
               search_terms,
               parameters,
               country,
               state_province,
               price_low,
               price_high,
               json_schema,
               sample_hash,
               data_hash,
               stage,
               date_created,
               date_modified
           }
         }`
        let variables = {
            id
        }
        let data = await this.client.request(query, variables);
        
        if ( data ['marketplace_data_source_detail'] !== undefined ) {
            return data ['marketplace_data_source_detail'][0];
        } else {
            return -1; 
        }
    }
}
