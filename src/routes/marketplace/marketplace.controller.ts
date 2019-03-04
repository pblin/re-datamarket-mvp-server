import * as express from 'express';
import { MarketplaceService } from './marketplace.service';

let cache = require('memory-cache');

const router = express.Router();

const marketplaceService= new MarketplaceService();
router.get('/', (req, res, next) => {
  return marketplaceService.getAllDatasets().then(datasets => {
    if( datasets < 0 ) {
        return res.status(404).send("resource not found");
    } else {
        return res.status(200).send(datasets)
    }
}).catch(() => {
    return res.status(500).send("unknown server error"); //TODO: Introduce better error handling
});
});

router.get('/dataset/:assetid', (req, res, next) => {
    return marketplaceService.getAdataset(req.params.assetid).then(datasets => {
      if( datasets < 0 ) {
          return res.status(404).send("resource not found");
      } else {
          return res.status(200).send(datasets)
      }
  }).catch(() => {
      return res.status(500).send("unknown server error"); //TODO: Introduce better error handling
  });
  });
router.get('/search', (req, res, next) => {
    let country = '';
    let region = '';
    let terms = '';
    if (req.query.country !== undefined) {
        country = req.query.country;
    }
    if (req.query.region !== undefined) {
        region = req.query.region;
    }
    if (req.query.terms !== undefined) {
        terms = req.query.terms;
    } else {
        return res.status(404).send("no search terms")
    }
    return marketplaceService.getDataFields(country, region, terms).then (datasets => {
        if (datasets < 0) {
            return res.status(404).send("resource not found");
        } else {
            return res.status(200).send(datasets)
        }
    }).catch(() => {
        return res.status(500).send("unknown server error"); //TODO: Introduce better error handling
    });
  });
  
export default router;
