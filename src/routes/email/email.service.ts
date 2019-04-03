import * as express from 'express';
import {Db} from '../../db/Db';
import {GraphQLClient} from 'graphql-request';
import  { SchemaService } from '../schema/schema.service';

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
  const emailTo = req.params.address;
  const supportEmail = 'support@rebloc.io';
  let dsId = req.body.dataset_id;
  let emailHTML = `<h3> Hi! ${req.params.address}</3><br\>`;
  if ( req.body.type == 's' || req.body.type == 'd') {
        const schemaService= new SchemaService();
        let datasetDetail; 
        try { 
            datasetDetail = await schemaService.getAdataset (dsId, 0);
        }
        catch(err) {
            console.log (err);
        }
        if (req.body.type == 's') { // sample data
            const {sample_access_url, enc_sample_key} = datasetDetail;

            let emailDataSample = `<h4> Download and descrypt sample data for dataset ${dsId} instruction </h4>
            <p>
            1. Download sample file from IPFS ${sample_access_url}  (from any gateway using filed_hash, http://ipfs_gateway/ipfs/file_hash) <br/><br/>
            2. Decrypt file (sample code at https://gist.github.com/pblin/2b476b016c04371d7b680c8e8dd31d0d with  data key [ ${enc_sample_key} ]
            <br/><br/> 
            3. Unzip the decryped file
            </p>
            <br/>
            Contact ${emailTo} or ${supportEmail} if you have questions. Have a nice day!`
            emailHTML += emailDataSample; 
        } else {
            const {id, access_url, enc_data_key} = datasetDetail;
            let emailData = `<h4> Download and descrypt sample data for dataset ${dsId} instruction </h4>
                            <p>
                            1. Download sample file from IPFS ${access_url}  (from any gateway using filed_hash, http://ipfs_gateway/ipfs/file_hash) <br/><br/>
                            2. Decrypt file (sample code at https://gist.github.com/pblin/2b476b016c04371d7b680c8e8dd31d0d with  data key [ ${enc_data_key} ]
                            <br/><br/> 
                            3. Unzip the decryped file
                            </p>
                            <br/>
                            Contact ${emailTo} or ${supportEmail} if you have questions. Have a nice day!`
            emailHTML += emailData; 
        }
    } else {
        let txnEmail = `<p>  
                        Here is the receipt of dataset ${dsId} for ${req.body.price} USD <br/>
                        <br/>
                        Contact ${emailTo} or ${supportEmail} if you have questions. Have a nice day!.
                        </p>`
        emailHTML += txnEmail; 
    }

  let transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    tls: true,
    auth: {
      user: supportEmail, // generated ethereal user
      pass: result.data['pass']// generated ethereal password
    }
  });
  console.log (emailHTML);
  // console.log(SMTP_HOST);
  // console.log (SMTP_PORT);

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"Rebloc Support" <support@rebloc.io>', // sender address
    to: req.params.address, // list of receivers
    subject: req.body.subject, // Subject line
    html: emailHTML // html body
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