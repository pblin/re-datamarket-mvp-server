const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
import 'graphql-request';
import ProfileRouter from './routes/profile/profile.controller';
import SchemaRouter  from './routes/schema/schema.controller';
import MarketplaceRouter from './routes/marketplace/marketplace.controller';
import Emailer from './routes/email/email.controller';
import FiatService from './routes/stripe/stripe.service';
const app = express();
const methodOverride = require('method-override');
import { HTTPS_ON, KEY_PASS, SSL_PFX, SSL_KEY, SSL_CERT } from './config/ConfigEnv';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import { LogService } from './utils/logger';
const logger = new LogService().getLogger();


app.use(function(req,res,next) { logger.info(req.method,req.url); next();} );
app.use(cors());
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

//Routes
app.use('/profile', ProfileRouter);
app.use('/schema', SchemaRouter);
app.use('/marketplace', MarketplaceRouter);
app.use('/stripe', FiatService);
app.use('/emailer', Emailer);
 
if (HTTPS_ON == 'YES') { 
   let credentials; 
   if (SSL_PFX != null) {
      credentials = {
            pfx: fs.readFileSync(SSL_PFX),
            passphrase: KEY_PASS
        };
      }
    else { 
      credentials = {
          key: fs.readFileSync(SSL_KEY),
          cert: fs.readFileSync(SSL_CERT),
          passphrase: KEY_PASS
      };
    }
    let httpsServer = https.createServer(credentials, app);
    httpsServer.listen(9000);
    logger.info(`API on https port 9000.`);

  } else { 
    let httpServer = http.createServer(app);
    httpServer.listen(9000);
    logger.info(`API on http port 9000.`);
}

// app.listen(PORT, () => {
//   console.log(`Rebloc API server running on port ${PORT}.`);
// });
