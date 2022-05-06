import { LogService } from '../../utils/logger';
import { VAULT_SERVER, VAULT_CLIENT_TOKEN, SMTP_HOST, SMTP_PORT } from '../../config/ConfigEnv';


const options = {
    apiVersion: 'v1', // default
    endpoint: VAULT_SERVER, // default
    token:  VAULT_CLIENT_TOKEN // optional client token; 
  };

const vault = require("node-vault")(options);
const nodemailer = require("nodemailer");
const logger = new LogService().getLogger();

export class EmailService {
    adminEmail = 'bl@silverlaketek.com';

    async sendmail( fromEmail: string, 
                    toEmail: string, 
                    ccEmail:string, 
                    subject:string, 
                    message: string) {
            
            let emailPass; 
            let result;
            try {
                result = await vault.read('secret/email');
            } catch (err)
                {
                    console.log("vault error=" + err);
                    logger.info(err);
                    return null;
                }

            if (result == null || result['data'] == null || result['data'] === undefined) 
                return "server error";
            else 
                emailPass = result.data['pass'];

            let transporter = nodemailer.createTransport({
                    host: SMTP_HOST,
                    port: SMTP_PORT,
                    tls: true,
                    auth: {
                    user: this.adminEmail, // generated ethereal user
                    pass: emailPass // generated ethereal password
                }
            });
            logger.info(message);

            // setup email data with unicode symbols
            let mailOptions = {
                from: fromEmail, // sender address
                to: toEmail, // list of receivers
                cc: ccEmail,
                subject: subject, // Subject line
                html: message // html body
            };    
            // send mail with defined transport object
            let info = null;
            try { 
                info = await transporter.sendMail(mailOptions);
            } catch (err) {
                console.log("mail server problem: " + err);
            }
            return info;
    }
}