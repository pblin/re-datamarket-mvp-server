import {Db} from "../../db/Db";
import {GraphQLClient} from "graphql-request";
import { EmailService } from '../email/email.service';
import { url } from "inspector";
import * as uuid from "uuid/v4";
const crypto = require("crypto");

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
verification_code \
verification_code_expiry \
primary_email_verified \
secondary_email_verified ";

export interface ProfileData {
    id: number,
    primary_email: string,
    secondary_emall: string,
    first_name: string,
    last_name: string,
    address: string,
    phone: string,
    roles: [string],
    wallet_address_1: string,
    wallet_address_2: string,  
    is_org_admin: boolean, 
    verification_code: string, 
    verification_code_expiry:  number,
    primary_email_verified: boolean,
    secondary_email_verified:  boolean
}
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
        let result = {
                code: 0,
                data: null
        };
        let data;
        try { 
            data = await this.client.request (query, variables);
        } catch (err) {
            console.log(err); 
            result.code = -1;
            return result;
        }

        if (data != null && data['marketplace_customer'] != null) {
            result.code = 1;
            result.data = data['marketplace_customer'][0];
        } else {
            result.code = 0;
        }
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

    async sendVerification(email: string, confirmationText: string) {
            const emailService = new EmailService();
            // console.log(email);
            try { 
                let info = await emailService.sendmail(
                                    "support@rebloc.io",
                                    email,
                                    "support@rebloc.io",
                                    "Confirm your email address",
                                    confirmationText);
            } catch (err) {
                console.log (err);
            }
        }
    async upsertProfile(profile: ProfileData) {

        // first time registration?
        const primaryEmail = profile['primary_email'];
        let existing = await this.getProfile (primaryEmail);
        if ( (existing.code > 0 && existing.data == null)  || 
             !profile['primary_email_verified'])  { //no profile exists or primary email not verified

            let today = new Date();
            profile['verification_code_expiry'] = today.getTime() + 86400000; // 24 hours from now
            let hash = crypto.createHash('sha256').update(uuid()).digest("base64");
            profile['verification_code'] = hash;
            console.log(hash);
            let confirmLink = encodeURIComponent(`http://demo-app.rebloc.io:3000/VerificationPage?email=${primaryEmail}&code=${hash}`);
            let confirmationText = 
                `<div>
                    <div>
                        <h4>Please verify your email address by clicking the link:</h4>
                    </div>
                    <div>
                        <a href=${confirmLink}> Verify Email</a>
                    </div>
                </div>`

            this.sendVerification(primaryEmail, confirmationText);
        }
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
    async verifyEmail (email:string, code:string) {
        let profile:ProfileData;
        let result  = await this.getProfile(email);
        profile = result.data;
        console.log(profile);

        if (profile != null) {
            // check verification code
            const today = new Date().getTime();
          
            if (today <= profile['verification_code_expiry']) {
                console.log('not expired yet');
                return (profile['verification_code'] == code) 
            }
            else 
                return false;
        } else 
            return false;
    }

}
