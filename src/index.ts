const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
import 'graphql-request';
import ProfileRouter from './routes/profile/profile.controller';
import SchemaRouter  from './routes/schema/schema.controller';
import MarketplaceRouter from './routes/marketplace/marketplace.controller';
import FiatRouter from './routes/stripe/stripe.service';
const app = express();
const methodOverride = require('method-override');
``
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
app.use('/stripe', FiatRouter);

const PORT = 9000;

app.listen(PORT, () => {
  console.log(`Rebloc API server running on port ${PORT}.`);
});
