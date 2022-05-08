import * as express from 'express';
import * as Stripe from 'stripe';
import * as multer from 'multer';
import * as uuidv4 from 'uuid/v4';
import { VAULT_SERVER, VAULT_CLIENT_TOKEN } from '../../config/ConfigEnv';
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();
const upload = multer();
// const router = express.Router();
var AsyncRouter = require("express-async-router").AsyncRouter;
var router = AsyncRouter();



const options = {
  apiVersion: 'v1', // default
  endpoint: VAULT_SERVER, // default
  token:  VAULT_CLIENT_TOKEN // optional client token; 
};

const vault = require("node-vault")(options);


async function processStripeCharge(userid:string, payload:any) 
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
  let charge;
  let id = 'na';
  let created = 0;

  result = await vault.read('secret/stripe');

  stripe = new Stripe(result.data['skey']);

  if (stripeTokenType === 'card') {
    const idempotency_key = uuidv4();
    try { 
      charge = await stripe.charges.create(
        {
          amount: amount,
          currency: currency,
          description: description,
          receipt_email: stripeEmail,
          source: stripeToken,
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
      console.log (err);
    }
  } else {
      status.ref = `Unrecognized Stripe token type: "${stripeTokenType}"`;
      return {status, ref: id, timestamp: created };
  }
  status.ref = "ok",
  id = charge.id;
  created = charge.created;

  return {status, ref: id, timestamp: created };
}

router.post('/charge/:userid', upload.none(), (req, res) => {
  console.log('charge...');
  logger.info(JSON.stringify(req.body));
  if (req.params.userid === undefined) 
    res.sendStatus(404).send("user id needed");
  return processStripeCharge(req.params.userid, req.body).then ( (result) => {
    logger.info(result);
    if (result['status']['ref'] != "ok")
          res.status(500).send(result);
        else 
          res.status(200).send(result);
  })
});

export default router;