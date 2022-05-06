import * as express from 'express';
import { SchemaService } from '../schema/schema.service';
import { ProfileService } from '../profile/profile.service';
import { EmailService } from './email.service';
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();

const router = express.Router();
const supportEmail = 'bl@silverlaketek.com';
router.post('/:address', async (req, res) => {
  logger.info(JSON.stringify(req.body));
  
  const emailTo = req.params.address;
  let dsId = req.body.dataset_id;
  let dsName = req.body.dataset_name;
  let emailHTML = `<h3> Hi! ${req.params.address}</3><br\>`;
  if ( req.body.type == 's' || req.body.type == 'd') {
        const schemaService= new SchemaService();
        let datasetDetail; 
        try { 
            datasetDetail = await schemaService.getAdataset (dsId, 0);
        }
        catch(err) {
            logger.error (err);
        }
        if (req.body.type == 's') { // sample data
            const {access_url,enc_data_key, data_hash} = datasetDetail;

            let emailDataSample = `<h4> Download and descrypt sample data for dataset id:"${dsId}" name:"${dsName}" instruction </h4>
            <p>
            1. Download sample file from IPFS ${access_url}  (from any gateway using filed_hash, http://ipfs_gateway/ipfs/file_hash) <br/><br/>
            2. Decrypt file (sample code at https://gist.github.com/pblin/2b476b016c04371d7b680c8e8dd31d0d with  data key [ ${enc_data_key} ]
            <br/><br/> 
            3. Unzip the decryped file, MD5 hash of the zip: ${data_hash}
            </p>
            <br/>
            Contact ${emailTo} or ${supportEmail} if you have questions. Have a nice day!`
            emailHTML += emailDataSample; 
        } else {
            const {sample_access_url, enc_sample_key, sample_hash} = datasetDetail;
            let emailData = `<h4> Download and descrypt sample data for dataset id:"${dsId}" name:"${dsName}" instruction </h4>
                            <p>
                            1. Download sample file from IPFS ${sample_access_url}  (from any gateway using filed_hash, http://ipfs_gateway/ipfs/file_hash) <br/><br/>
                            2. Decrypt file (sample code at https://gist.github.com/pblin/2b476b016c04371d7b680c8e8dd31d0d with  data key [ "${enc_sample_key}" ]
                            <br/><br/>
                            3. Unzip the decryped file, MD5 hash of the zip: ${sample_hash}
                            </p>
                            <br/>
                            Contact ${emailTo} or ${supportEmail} if you have questions. Have a nice day!`
            emailHTML += emailData; 
        }
    } else {
        let txnEmail = `<p>  
                        Here is the receipt of dataset id:"${dsId}" name:"${dsName}" for ${req.body.price} USD <br/>
                        <br/>
                        Contact ${emailTo} or ${supportEmail} if you have questions. Have a nice day!.
                        </p>`
        emailHTML += txnEmail; 
    }

  // send mail with defined transport object
  let info = null;
  let emailService = new EmailService();
  try { 
    info = await emailService.sendmail( supportEmail, 
                                        emailTo,
                                        supportEmail,
                                        req.body.subject, 
                                        emailHTML);
    } 
  catch (err) {
      logger.error(err);
      res.status(500).send("eamil server error");
  }
  if (info != null) {
    logger.info("Message sent: %s", info.messageId);
    res.sendStatus(200);
  } else {
      res.status(404).send("email not sent");
  }

});

router.post('/:address/send/:ownerid', async (req, res) => {
  console.log(JSON.stringify(req.body));

  const emailFrom = req.params.address;
  let receiverProfile;
  let profileService = new ProfileService();
  try { 
    receiverProfile = await profileService.getProfileWithId(req.params.ownerid);
  }
  catch (err) {
    logger.error(err);
    res.status(500).send("Receiver profile query error.")
  }

  if ( receiverProfile['marketplace_customer'] == undefined || 
       receiverProfile['marketplace_customer'].length == 0 || 
       receiverProfile['marketplace_customer'][0] == null )
       {
          res.status(404).send('Receiver not found.');
       }
  
  const { first_name, last_name, primary_email } = receiverProfile['marketplace_customer'][0];
  // console.log(receiverProfile);
  let dsName = req.body.dataset_name;
  let dsId = req.body.dataset_id;

  let emailText = `Hi! ${first_name} ${last_name}:\n` +
                  `you have a message from ${emailFrom} about dataset "${dsId}" name:"${dsName}":\n` + 
                  req.body.message;

  // console.log (emailText);

  // send mail with defined transport object
  let info = null;
  let emailService = new EmailService();
  try { 
    info = await emailService.sendmail (  supportEmail, 
                                          primary_email,
                                          emailFrom,
                                          req.body.subject, 
                                          emailText);
    } catch (err) {
      console.log ("email service error");
      logger.error(err);
      res.status(500).send("eamil server error");
  }

  if (info != null) {
      // console.log("Message sent: %s", info.messageId);
      res.sendStatus(200);
  } else {
      res.status(404).send("email not sent");
  }

});

export default router;