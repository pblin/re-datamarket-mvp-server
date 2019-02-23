import * as express from 'express';
import { MarketplaceService } from './marketplace.service';

const router = express.Router();

const marketplaceService= new MarketplaceService();

router.get('/', (req, res, next) => {
  return marketplaceService.getAllDatasetsOfUser().then(datasets => {
    if( datasets < 0 ) {
        return res.status(404).send();
    } else {
        return res.status(200).send(datasets)
    }
}).catch(() => {
    return res.status(500).send(); //TODO: Introduce better error handling
})
});

export default router;
