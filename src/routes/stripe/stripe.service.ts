import * as express from 'express';
import * as Stripe from 'stripe';
import * as multer from 'multer';
import * as uuidv4 from 'uuid/v4';
import { VAULT_SERVER, VAULT_CLIENT_TOKEN } from '../../config/ConfigEnv';
const router = express.Router();
const upload = multer();

router.post('/charge/:userid', upload.none(), async (req, res) => {
  console.log(JSON.stringify(req.body));
  if (req.params.userid === undefined) 
    res.sendStatus(404).send("user id needed");

  let options = {
    apiVersion: 'v1', // default
    endpoint: VAULT_SERVER, // default
    token:  VAULT_CLIENT_TOKEN // optional client token; 
  };

  let vault = require("node-vault")(options);
  let stripe; 
  let result = await vault.read('secret/stripe');
  console.log(result.data);
  if (result == null || result['data'] == null || result['data'] === undefined) {
    res.sendStatus(500).json({ result, "message":"Payment API error"});
  }

  stripe = new Stripe(result.data['skey']);
  let error;
  let status = 'failed';
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

    console.log("amount=" + amount)

    // does not have the need to create a customer for the moment
    // const customer = await stripe.customers.create({
    //   email: stripeEmail,
    //   source: stripeToken,
    //   metadata: {
    //     userId: req.params.userid,
    //   }
    // });

    if (stripeTokenType === 'card') {
      const idempotency_key = uuidv4();
      const charge = await stripe.charges.create(
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
      console.log('charge:');
      console.log(JSON.stringify(charge));
    } else {
      throw Error(`Unrecognized Stripe token type: "${stripeTokenType}"`);
    }
    
    status = 'success';
    code = 200;
    console.log(status);

  } catch (err) {
    console.error(err);
    error = err;
    code = 500;
    console.log(err);
  }

  res.json({ error, status });
});

export default router;