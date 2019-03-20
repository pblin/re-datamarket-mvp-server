import * as express from 'express';
import * as Stripe from 'stripe';
import * as multer from 'multer';
import * as uuidv4 from 'uuid/v4';
const router = express.Router();
const upload = multer();

router.post('/payment', upload.none(), async (req, res) => {
  console.log(JSON.stringify(req.body));

  let options = {
    apiVersion: 'v1', // default
    endpoint: 'http://demo-app.rebloc.io:8200', // default
    token: 's.NqHfvnUc31muxw4Vi41ZGNCb' // optional client token; 
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

 
    const customer = await stripe.customers.create({
      email: stripeEmail,
      source: stripeToken,
      metadata: {
        userId: req.user.id,
      },
    });

    if (stripeTokenType === 'card') {
      const idempotency_key = uuidv4();
      const charge = await stripe.charges.create(
        {
          amount,
          currency: currency,
          customer: customer.id,
          description: description,
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
    console.log(status);

  } catch (err) {
    console.error(err);
    error = err;
    console.log(err);
  }

  res.json({ error, status });
});

export default router;