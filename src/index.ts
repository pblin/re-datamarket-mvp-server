const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
import 'graphql-request';
import { GraphQLClient } from 'graphql-request';
import { APIKEY, GRAPHQL } from './config/ConfigEnv';
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


async function saveDataset (ds:any) {
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

  const client = new GraphQLClient (GRAPHQL, {
    headers: {
      'X-Hasura-Access-Key': APIKEY,
    },
  });
  let data = await client.request(mut, variables);
  // @ts-ignore
  if (data.insert_marketplace_data_source_detail !== undefined) {
    // @ts-ignore
    return data.insert_marketplace_data_source_detail.affected_rows;
  } else return 0; 
}

async function extractAndSaveDataFields (schemaItems:any, dsId:string) {
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

  const client = new GraphQLClient (GRAPHQL, {
    headers: {
      'X-Hasura-Access-Key': APIKEY,
    },
  });

  let data = await client.request(mut, variables);
  // @ts-ignore
  if (data.insert_marketplace_source_of_field !== undefined) {
      // @ts-ignore
      return data.insert_marketplace_source_of_field.affected_rows;
  } else {
       return 0; 
  }

}
app.post('/schema', (req, res) => {

      let schemaItems = null;
      try  {
        schemaItems = JSON.parse(req.body.json_schema);
      }
      catch (e) {
        console.log(e);
        res.status(500).send(e.message);
      }
      new Promise ( function (resolve, reject) {
        if (saveDataset(req.body)) {
          resolve (1);
        } else {
          reject (-1);
        }
      }).then ( function (resolve) { 
          new Promise (function (resolve1, reject1) { 
              if (extractAndSaveDataFields(schemaItems, req.body.id)) {
                  resolve1 (1);
                } else {
                  reject1 (-1);
                }
            }).then ( function (resolve1) {
               res.sendStatus(200);
            }).catch ((err) => { res.status(500).send(err.message); });
        }).catch ((err) => {res.status(500).send(err.messge); });
});

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

const PORT = 9000;

app.listen(PORT, () => {
  console.log(`Rebloc GraphQL server running on port ${PORT}.`);
});
