import {Db} from "../../db/Db";
import {GraphQLClient} from "graphql-request";
import { EmailService } from '../email/email.service';
import { url } from "inspector";
import * as uuid from "uuid/v4";
import { WSAEPROVIDERFAILEDINIT } from "constants";
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
verification_code_1 \
verification_code_expiry_1 \
verification_code_2 \
verification_code_expiry_2 \
primary_email_verified \
secondary_email_verified ";

export interface ProfileData {
    id: number,
    primary_email: string,
    secondary_email: string,
    first_name: string,
    last_name: string,
    address: string,
    phone: string,
    roles: [string],
    wallet_address_1: string,
    wallet_address_2: string,  
    is_org_admin: boolean, 
    verification_code_1: string, 
    verification_code_expiry_1:  number,
    verification_code_2: string, 
    verification_code_expiry_2:  number,
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

    async sendVerification(email:string, profile:ProfileData) {
            if (email == null) //nothing to verify
                return profile;
            if (email === profile.primary_email && profile.primary_email_verified) 
                return profile; //already verified

            if (email === profile.secondary_email && profile.secondary_email_verified)
                return profile;

            const emailService = new EmailService();
            let today = new Date();
            let expiry = today.getTime() + 86400000; // 24 hours from now
            let hash = crypto.createHash('sha256').update(uuid()).digest("base64");
            let confirmLink = encodeURIComponent(`http://demo-app.rebloc.io:3000/VerificationPage?email=${email}&code=${hash}`);
            let confirmationText = 
                `<div>
                    <div>
                        <h4>Please verify your email address by clicking the link:</h4>
                    </div>
                    <div>
                        <a href=${confirmLink}> Verify Email</a>
                    </div>
                </div>`
            try { 
                console.log (confirmationText);
                let info = await emailService.sendmail(
                                    "support@rebloc.io",
                                    email,
                                    "support@rebloc.io",
                                    "Verify your email address",
                                    confirmationText);
            } catch (err) {
                console.log (err);
                return profile;
            }
            if (email === profile.primary_email) {
                profile.verification_code_expiry_1 = expiry;
                profile.verification_code_1  = hash;
            } else {
                profile.verification_code_expiry_2 = expiry;
                profile.verification_code_2  = hash;
            }
            return profile;
        }
    async upsertProfile(profile:ProfileData) {
         //no profile exists or primary email not verified
        if ( profile == null)  
                profile = await this.sendVerification(profile.primary_email, profile);
    
        let str = "";
        for (var key in profile ) {
            console.log(key);
            str = str + key + ',';
           }
        let columns = str.substring(0,str.length-1)
        // console.log(columns);
        // console.log(profile);
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
       
        // console.log(query);
        const variables = {
            objects: []
        };

        variables.objects.push(profile);
        console.log(variables);
        let result; 
        try { 
            result = await this.client.request(query, variables);
        } catch (err) {
            console.log(err);
            return null;
        } 
        console.log(result['insert_marketplace_customer']);
        if (result['insert_marketplace_customer'] != null)
            return result['insert_marketplace_customer'].returning[0];
        else 
            return null;
    }
    async verifyEmail (email:string, code:string) {
        let profile:ProfileData;
        let result  = await this.getProfile(email);
        profile = result.data;
        console.log(profile);

        if (profile == null)
            return false;

        // check verification code
        const today = new Date().getTime();
        let isPrimary = (email === profile.primary_email);
        if (isPrimary) {
            // expired
            if (today > profile.verification_code_expiry_1)
                return false; 

            console.log('1st code not expired yet');
            profile.primary_email_verified = (profile.verification_code_1 === code);
            return profile.primary_email_verified;
        } else {
            if (today > profile.verification_code_expiry_2)
                return false; 
            
            console.log('2nd code not expired yet');
            profile.secondary_email_verified = (profile.verification_code_2 === code)
            return profile.secondary_email_verified;
        }
    }

}
