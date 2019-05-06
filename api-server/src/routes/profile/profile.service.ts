import {Db} from "../../db/Db";
import {GraphQLClient} from "graphql-request";

const profileCols = 
"id \
primary_email \
secondary_email \
first_name \
last_name \
address \
phone \
roles \
wallet_address_1 \
wallet_address_2 \
is_org_admin \
email_verified ";

export class ProfileService {
    client: GraphQLClient;

    constructor() {
        this.client = Db.getInstance().client;
    }
    async getProfile(email: string) {
        const query = `query customer ($email: String ) {
          marketplace_customer (where:{primary_email:{ _eq : $email }})
          {
              ${profileCols}
          }
        }`;

        const variables = {
             email
        };

        let result = await this.client.request (query, variables);
        return result;
    }

    async getProfileWithId(id: number) {
        const query = `query customer ($id: Int) {
          marketplace_customer (where:{id :{ _eq : $id}})
          {
            ${profileCols}
          }
        }`;

        const variables = {
             id
        };

        let result = await this.client.request (query, variables);
        return result;
    }
    async upsertProfile(profile: any) {
        let str = "";
        for (var key in profile ) {
            console.log(key);
            str = str + key + ',';
           }
        let columns = str.substring(0,str.length-1)
        // console.log(columns);
        const query = `
            mutation insert_marketplace_customer ($objects:[marketplace_customer_insert_input!]!)
             {
              insert_marketplace_customer ( 
                objects:$objects,
                on_conflict: { 
                  constraint: customer_pkey, 
                  update_columns: [ ${columns} ] 
                }
              ) {
                returning {
                    ${profileCols}
                }
              }
            }`;
       
        console.log(query);
        const variables = {
            objects: []
        };
        variables.objects.push(profile);
        console.log(variables);
        let result = await this.client.request (query, variables);
        return result;
    }
}
