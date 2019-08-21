import * as express from 'express';
import * as Stripe from 'stripe';
import * as multer from 'multer';
import * as uuidv4 from 'uuid/v4';
import { VAULT_SERVER, VAULT_CLIENT_TOKEN } from '../../config/ConfigEnv';
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();
const router = express.Router();
const upload = multer();

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
  try { 
    result = await vault.read('secret/stripe');
  } 
  catch (err) {
    logger.error(err);
  }

  let status;
  let charge;
  // console.log(result.data);
  if (result == null || result['data'] == null || result['data'] === undefined) {
      status ={ ref: "Payment credential error"} ;
  }

  stripe = new Stripe(result.data['skey']);

  let id = -1;
  let created = 0;

  try {
    let charge;

    if (stripeTokenType === 'card') {
      const idempotency_key = uuidv4();
      charge = await stripe.charges.create(
        {
          amount: amount,
          currency: currency,
          description: description,
          receipt_email: stripeEmail,
          source: stripeToken,
          statement_descriptor: 'Rebloc marketplace',
          metadata: {
            customerId: userid,
            productId: product
          }
        },
        {
          idempotency_key,
        }
      );
      logger.info("Charge ->" + JSON.stringify(charge));
    } else {
        status = { ref: `Unrecognized Stripe token type: "${stripeTokenType}"`};
    }
    
    status = 
      {
        ref:"success",
        timestamp:charge.created
      };
      id = charge.id;
      created = charge.created;

  } catch (err) {
      status = {
        ref:"failed",
        timestamp: 0
      };
      logger.error(err);
  }
  
  return {status, ref: id, timestamp: created }
}

router.post('/charge/:userid', upload.none(), (req, res) => {
  logger.info(JSON.stringify(req.body));

  if (req.params.userid === undefined) 
    res.sendStatus(404).send("user id needed");

  return processStripeCharge(req.params.userid, req.body).then(result => {
      if (result['id'] < 0) 
        res.status(400).send(result['status']);
      else 
        res.status(200).send(result);

  }).catch((err) => {
    logger.error(`stripe charge: ${err}`);
    return res.status(500).send("unknown stripe error"); 
  });

});

export default router;