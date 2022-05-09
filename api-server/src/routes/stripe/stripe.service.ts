//import * as express from 'express';
import * as Stripe from 'stripe';
import * as multer from 'multer';
import * as uuidv4 from 'uuid/v4';
import { VAULT_SERVER, VAULT_CLIENT_TOKEN, STRIPE_KEY } from '../../config/ConfigEnv';
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();
const upload = multer();

const options = {
  apiVersion: 'v1', // default
  endpoint: VAULT_SERVER, // default
  token:  VAULT_CLIENT_TOKEN // optional client token; 
};

const stripe = require('stripe')(STRIPE_KEY); 
export class StripeServices {
    async processCharge(userid:string, payload:any) 
    {
      const {
        product,
        amount,
        csrfToken,
        currency = 'usd',
        description,
        stripeBillingAddressCity,
        stripeBillingAddressCountry,
        stripeBillingAddressLine1,
        stripeBillingAddressState,
        stripeBillingAddressZip,
        stripeBillingName,
        stripeEmail,
        stripeShippingAddressCity,
        stripeShippingAddressCountry,
        stripeShippingAddressLine1,
        stripeShippingAddressState,
        stripeShippingAddressZip,
        stripeShippingName,
        stripeToken,
        stripeTokenType,
      } = payload;

      let stripe; 
      let result; 
      let status = { ref: "failed" };
      let id = 'na';
      let created = 0;
      let charge; 
      
      // var vault = require("node-vault")(options);
      // try {
      //   result = await vault.read('secret/stripe');
      // } catch (err)
      // {
      //   console.log("vault error" + err);
      //   logger.info("something wrong with vault" + err);
      // }

      if (stripeTokenType === 'card') {
        const idempotency_key = uuidv4();
        try { 
            // @ts-ignore
            charge = await stripe.charges.create(
            {
              amount: amount,
              currency: currency,
              description: description,
              receipt_email: stripeEmail,
              source: stripeToken.id,
              statement_descriptor: 'NFT marketplace',
              metadata: {
                customerId: userid,
                productId: product
              }
            },
            {
              idempotency_key,
            }
          );
        } catch (err) {
          console.log ('stripe charge error');
          logger.info  ('stripe charge error');
          console.log (err);
          logger.info (err);
        }
      } else {
          status.ref = `Unrecognized Stripe token type: "${stripeTokenType}"`;
          return {status, ref: id, timestamp: created };
      }
      if (charge.status === 'succeeded') {
        status.ref = "ok",
        id = charge.id;
        created = charge.created;
        logger.info ('CC charge ok');
      } else {
        status.ref = "failed";
        logger.info ('CC charge failed');
      }
      return {status, ref: id, timestamp: created };
    }
}