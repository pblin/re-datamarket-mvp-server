const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
import 'graphql-request';
import { GraphQLClient } from 'graphql-request';
import { APIKEY, GRAPHQL } from './config/ConfigEnv';
import ProfileRouter from './routes/profile/profile.controller';
import SchemaRouter  from './routes/schema/schema.controller';
import MarketplaceRouter from './routes/marketplace/marketplace.controller';

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

//Routes
app.use('/profile', ProfileRouter);
app.use('/schema', SchemaRouter);
app.use('/marketplace', MarketplaceRouter);

const PORT = 9000;

app.listen(PORT, () => {
  console.log(`Rebloc API server running on port ${PORT}.`);
});
