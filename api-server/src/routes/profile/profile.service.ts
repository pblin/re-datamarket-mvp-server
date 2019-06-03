import {Db} from "../../db/Db";
import {GraphQLClient} from "graphql-request";
import { EmailService } from '../email/email.service';
import { url } from "inspector";
import * as uuid from "uuid/v4";
import { WSAEPROVIDERFAILEDINIT } from "constants";
import { VAULT_SERVER, VAULT_SERVER_TOKEN } from '../../config/ConfigEnv';
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();

const options = {
  apiVersion: 'v1', // default
  endpoint: VAULT_SERVER, // default
  token:  VAULT_SERVER_TOKEN // optional client token; 
};

const vault = require("node-vault")(options);
const hex = require('string-hex');
const crypto = require("crypto");
const ethWallet = require("ethereumjs-wallet");

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
            logger.error(err); 
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
        logger.info(result);
        return result;
    }

    async sendVerification(email:string, profile:ProfileData) {
            if (email == null) //nothing to verify
                return profile;

            if (email == profile.primary_email && profile.primary_email_verified) 
                return profile; //already verified

            if (email == profile.secondary_email && profile.secondary_email_verified)
                return profile;
            
            logger.info(`send verification email to: ${email}`);

            const emailService = new EmailService();
            let today = new Date();
            let expiry = today.getTime() + 86400000; // 24 hours from now
            //let hash = crypto.createHash('sha256').update(uuid()).digest("base64");
            let hash = uuid();
            //TODO: make this url configurable
            let confirmLink = encodeURIComponent(`https://demo-app.rebloc.io:3000/VerificationPage?email=${email}&code=${hash}`);
            let confirmationText = 
                `<div>
                    <div>
                        <h4>Please verify your email address by clicking the link:</h4>
                    </div>
                    <div>
                        <a href="${confirmLink}"> Verify Email</a>
                        <p>Or visit: ${decodeURIComponent(confirmLink)}</p>
                    </div>
                </div>`
            try { 
                logger.info(confirmationText);
                let info = await emailService.sendmail(
                                    "support@rebloc.io",
                                    email,
                                    "support@rebloc.io",
                                    "Verify your email address",
                                    confirmationText);
            } catch (err) {
                logger.error("email send error = " + err);
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

        let email2Hex = hex(profile.primary_email);
        const walletKey = `secret/${email2Hex}-1`;
        logger.info ('wallet key =' + walletKey);

        let walletPKQuery = null;
        let address_1 = null;
        try { 
            walletPKQuery = await vault.read(walletKey);
            logger.info("wallet query = " + JSON.stringify(walletPKQuery));
        } catch (err) {
            logger.info ("no private key, creat new key pair");
            let userWallet = ethWallet.generate();
            let savePrivateKey = await vault.write(walletKey,{pk:userWallet.getPrivateKeyString()});
            address_1 = userWallet.getChecksumAddressString();
            logger.info(`wallet address 1 = ${address_1}`);
            profile['wallet_address_1'] = address_1;
        }
        
        let str = "";
        for (var key in profile ) {		
              logger.info(key);		
             str = str + key + ',';		
            }		
        
        let columns = str.substring(0,str.length-1);

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

        logger.info(query);
        const variables = {
            objects: []
        };

        variables.objects.push(profile);
        logger.info(variables);

        let result; 
        try { 
            result = await this.client.request(query, variables);
        } catch (err) {
            logger.error('graphQL error = ' + err);
            return null;
        } 
        logger.info(result['insert_marketplace_customer']);
        if (result['insert_marketplace_customer'] != null)
            return result['insert_marketplace_customer'].returning[0];
        else 
            return null;
    }

    async verifyEmail (email:string, code:string) {
        let profile:ProfileData;
        let result  = await this.getProfile(email);
        profile = result.data;
        logger.info(profile);

        if (profile == null)
            return false;

        // check verification code
        const today = new Date().getTime();
        let isPrimary = (email == profile.primary_email);
        // console.log(isPrimary);

        if (isPrimary) {
            // expired
            if (today > profile.verification_code_expiry_1)
                return false; 

            logger.info('1st code not expired yet');
            logger.info ('code =' + code + ' | code in db = ' + profile.verification_code_1);
            profile.primary_email_verified = (profile.verification_code_1 == code);
            let result = await this.upsertProfile(profile);
            return result.primary_email_verified;

        } else {
            if (today > profile.verification_code_expiry_2)
                return false; 
            
            logger.info('2nd code not expired yet');
            logger.info ('code =' + code + ' | code in db = ' + profile.verification_code_2);
            profile.secondary_email_verified = (profile.verification_code_2 == code);
            let result = await this.upsertProfile(profile);
            return result.secondary_email_verified;
        }
    }

}
