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
router.post('/charge/:userid', upload.none(), async (req, res) => {
  logger.info(JSON.stringify(req.body));
  if (req.params.userid === undefined) 
    res.sendStatus(404).send("user id needed");

  let stripe; 
  let result;
  try { 
    result = await vault.read('secret/stripe');
  } 
  catch (err) {
    logger.error(err);
    res.status(500).send("secret vault connection problem");
  }
  // console.log(result.data);
  if (result == null || result['data'] == null || result['data'] === undefined) {
      res.status(500).json({ result, "message":"Payment credential error"});
  }

  stripe = new Stripe(result.data['skey']);
  let error;
  let status;
  let code = 200;
  try {
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
    } = req.body;

    logger.info("amount=" + amount)
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
            customerId: req.params.userid,
            productId: product
          }
        },
        {
          idempotency_key,
        }
      );
      logger.info(JSON.stringify(charge));
    } else {
      throw Error(`Unrecognized Stripe token type: "${stripeTokenType}"`);
    }
    
    status = 
      {
        ref:charge.id,
        timestamp:charge.created
      };
    code = 200;
    // console.log(status);

  } catch (err) {
      console.error(err);
      status = {
        ref:"failed",
        timestamp: 0
      };
      error = err;
      code = 500;
      logger.error(err);
  }

  res.json({ error, status });
});

export default router;