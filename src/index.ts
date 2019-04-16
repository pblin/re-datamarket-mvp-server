const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
import 'graphql-request';
import ProfileRouter from './routes/profile/profile.controller';
import SchemaRouter  from './routes/schema/schema.controller';
import MarketplaceRouter from './routes/marketplace/marketplace.controller';
import EmailService from './routes/email/email.service';
import FiatService from './routes/stripe/stripe.service';
const app = express();
const methodOverride = require('method-override');
import { HTTPS_ON, KEY_PASS, SSL_PEM, SSL_KEY, SSL_PFX } from './config/ConfigEnv';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';


app.use(function(req,res,next){console.log(req.method,req.url); next();});
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
app.use('/emailer', EmailService);
 
if (HTTPS_ON == 'YES') { 
    const credentials = {
        // key: fs.readFileSync(SSL_KEY),
        // cert: fs.readFileSync(SSL_PEM),
        pfx: fs.readFileSync(SSL_PFX),
        passphrase: KEY_PASS
      };
    let httpsServer = https.createServer(credentials, app);
    httpsServer.listen(9000);
    console.log(`API on https port 9000.`);

  } else { 
    let httpServer = http.createServer(app);
    httpServer.listen(9000);
    console.log(`API on http port 9000.`);
}

// app.listen(PORT, () => {
//   console.log(`Rebloc API server running on port ${PORT}.`);
// });
