import * as express from 'express';
import {Db} from '../../db/Db';
import {GraphQLClient} from 'graphql-request';
import { VAULT_SERVER, VAULT_CLIENT_TOKEN, SMTP_HOST, SMTP_PORT } from '../../config/ConfigEnv';

const router = express.Router();
const options = {
    apiVersion: 'v1', // default
    endpoint: VAULT_SERVER, // default
    token:  VAULT_CLIENT_TOKEN // optional client token; 
  };
const vault = require("node-vault")(options);
const nodemailer = require("nodemailer");

router.post('/:address', async (req, res) => {
  console.log(JSON.stringify(req.body));
  let result = await vault.read('secret/email');
  // console.log(result.data);

  if (result == null || result['data'] == null || result['data'] === undefined) {
    res.sendStatus(500).json({ result, "message":"email credential error"});
  }

  let transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    tls: true,
    auth: {
      user: 'support@rebloc.io', // generated ethereal user
      pass: result.data['pass']// generated ethereal password
    }
  });
  // console.log(SMTP_HOST);
  // console.log (SMTP_PORT);

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"Rebloc Support" <support@rebloc.io>', // sender address
    to: req.params.address, // list of receivers
    subject: req.body.subject, // Subject line
    html: req.body.notification // html body
  };

  // send mail with defined transport object
  let info = null;
  try { 
    info = await transporter.sendMail(mailOptions)
  } 
  catch (err) {
      console.log (err);
      res.status(500).send("eamil server error");
  }
  if (info != null) {
    console.log("Message sent: %s", info.messageId);
    res.sendStatus(200);
  } else {
      res.status(404).send("email not sent");
  }

});

export default router;