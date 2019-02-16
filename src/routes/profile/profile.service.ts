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
}
