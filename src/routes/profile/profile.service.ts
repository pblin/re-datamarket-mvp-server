import {Db} from "../../db/Db";
import {GraphQLClient} from "graphql-request";

export class ProfileService {
    client: GraphQLClient;

    constructor() {
        this.client = Db.getInstance().client;
    }

    async getProfile(email: string) {
        const query = `query customer ($email: String ) {
          marketplace_customer (where:{primary_email:{ _eq : $email }})
          {
              id
              primary_email
              secondary_email
              first_name
              last_name
              phone
              address
              is_org_admin
          }
        }`;

        const variables = {
             email
        };

        let result = await this.client.request (query, variables);
        return result;
    }

    async createProfile(profile: any) {
        const query = `
            mutation insert_marketplace_customer ($objects:[marketplace_customer_insert_input!]!)
             {
              insert_marketplace_customer ( 
                objects:$objects,
                on_conflict: { 
                  constraint: customer_pkey, 
                  update_columns: [first_name,last_name,secondary_email,address,phone,is_org_admin] 
                }
              ) {
                returning {
                  id
                  primary_email
                  secondary_email
                  first_name
                  last_name
                  address
                  phone
                  is_org_admin
                }
              }
            }`;

        const variables = {
            objects: [
                {
                    "primary_email": profile.primaryEmail,
                    "secondary_email": profile.secondaryEmail,
                    "first_name": profile.firstName,
                    "last_name": profile.lastName,
                    "address": profile.address,
                    "phone": profile.phone,
                    "is_org_admin": false
                }
            ]
        };

        let result = await this.client.request (query, variables);
        return result;
    }
}
