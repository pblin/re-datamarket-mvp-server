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
date_created \
date_modified \
last_update \
update_frequency \
geolocation \
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
        const url = DATA_HOST_URL + 'decrypt/' + datasetInfo['enc_sample_key'] + '/' + file_hash;
        console.log(url);
        const options ={
            uri: url,
            method: 'GET',
            rejectUnauthorized: false
        };
        logger.info(url);
        let response = await fetch(options);
        console.log(JSON.stringify(response));
        return response;
    }
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
                        summary.country[i].region[ii].count = 1;
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
        console.log(JSON.stringify(summary));
        return summary;
    }

    removeDefaultGeoFactset(factsets:any)
    {
        console.log(factsets.country[0].count);
        if (factsets.country[0].count == 0) 
            factsets.country.shift()
        else {
            console.log(factsets.country[0].region[0].count);
            if (factsets.country[0].region[0].count == 0) {
                factsets.country[0].region.shift();
                // console.log("region legth:" + factsets.country[0].region.length);
            }
            else {
                console.log(factsets.country[0].region[0].city[0].count);
                if (factsets.country[0].region[0].city[0].count == 0)
                    factsets.country[0].region[0].city.shift()
            }
        }
        return factsets;
    }
    topicFactsets (result:any) {
        let summary = {
            topic:[]
        }
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
        console.log(JSON.stringify(summary));
        return summary;
    }
 
    async searchDataset(
                        purchased_by:number,
                        user_id:number,
                        fields:string,
                        topics:string,
                        cities:string,
                        region:string,
                        country:string,
                        op:string) 
    {
        fields = fields.replace(/,/g,'|');
        fields = fields.replace(/ /g,'|');
        console.log ("fields="+fields);
        let query = `
                query {
                    marketplace_search_dataset_schema ( 
                        args: { 
                            purchased_by: ${purchased_by},
                            user_id: ${user_id},
                            fields: "${fields}", 
                            topics: "${topics}", 
                            cities: "${cities}", 
                            region:  "${region}",
                            ctn: "${country}"
                        }
                    ) {
                        dataset_id,
                        dataset_name
                        topic
                        city
                        state_province
                        country
                        field_name
                        field_type
                        field_label
                        field_description
                        dataset_owner_id
                    }
                }` 
        logger.info (query);
        let data = await this.client.request(query);
        
        if ( data ['marketplace_search_dataset_schema'] !== undefined ) {
            let result = data['marketplace_search_dataset_schema'];

            let response = {
                "geoFactsets": null,
                "topicFactsets":null,
                "datasets": result
            };
            if (result.length > 0) {
                 let geoFactsets = this.geoFactsets(result);
                 response.geoFactsets = this.removeDefaultGeoFactset(geoFactsets);
                 response.topicFactsets = this.topicFactsets(result);
            }

            return response;
        } else {
            return null; 
        }
    }

    async searchDatasetObject(
                                purchased_by:number,
                                user_id:number,
                                fields:string,
                                city_county:string,
                                region:string,
                                country:string) 
            {
                fields = fields.replace(/,/g,'|');
                fields = fields.replace(/ /g,'|');
                console.log ("fields="+fields);
                let query = `query {
                                    marketplace_search_dataset_object ( 
                                        args: { 
                                            purchased_by: ${purchased_by},
                                            user_id: ${user_id},
                                            fields: "${fields}", 
                                            in_city_county: "${city_county}", 
                                            in_region:  "${region}",
                                            ctn: "${country}"
                                        }
                                    ) {
                                        object_name 
                                        field_name
                                        field_description
                                        field_category
                                        country
                                        state_province
                                        city
                                        dataset_name
                                        topic
                                        dataset_id
                                    }
                                }`;

                logger.info (query);
                let data = await this.client.request(query);

                if ( data ['marketplace_search_dataset_object'] !== undefined ) {
                    let result = data['marketplace_search_dataset_object'];

                    let response = {
                            "geoFactsets": null,
                            "objects": result
                        }

                    if (result.length > 0) {
                        let geoFactsets = this.geoFactsets(result);
                        response.geoFactsets = this.removeDefaultGeoFactset(geoFactsets);
                    }
                    return response;

                } else {
                    return null; 
                }
        }
}
