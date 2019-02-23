import {Db} from '../../db/Db';
import {GraphQLClient} from 'graphql-request';

export class MarketplaceService {
    client: GraphQLClient;

    constructor() {
        this.client = Db.getInstance().client;
    }

    async getAllDatasetsOfUser () {
        const query =  `query  {
            marketplace_data_source_detail 
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
}
