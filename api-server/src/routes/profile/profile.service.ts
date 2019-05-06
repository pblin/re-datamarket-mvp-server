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
        if (result != null && result['marketplace_customer'] != null) 
            return result['marketplace_customer'][0];
        else 
            return null;
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
        if (result != null && result['insert_marketplace_customer'] != null)
            return result['insert_marketplace_customer'].returning[0];
        else 
            return null;
    }

    async getVerificationInfo(user_id:string) {
        const query = `
            query profile_verified ($user_id: Int) {
                marketplace_verified_profile ( where: {user_id: {_eq: $user_id }} )
                {
                user_id
                code
                expired_at
                }
            }`;

        const variables = {
                user_id
           };
   
        let result = await this.client.request (query, variables);
        // console.log(result);
        if (result != null && result['marketplace_verified_profile'] != null) 
            return result['marketplace_verified_profile'][0];
         else 
            return null;
    }
    async insertVerificationInfo(verified_info: any) {
        console.log (verified_info);
        const mut = `
            mutation insert_marketplace_verified_profile 
                    ($objects:[marketplace_verified_profile_insert_input!]!)
                {
                    insert_marketplace_verified_profile ( 
                        objects:$objects
                    ) {
                        returning {
                            user_id
                            code
                            expired_at
                        }
                    }
                }`;

        const variables = {
            objects: []
        };
        // console.log(mut);
        variables.objects.push(verified_info);
        // console.log(variables);
        let result = await this.client.request (mut, variables);
        if (result != null && result['insert_marketplace_verified_profile'] != null) 
            return result['insert_marketplace_verified_profile'].returning[0];
        else 
            return null;
    }
}
