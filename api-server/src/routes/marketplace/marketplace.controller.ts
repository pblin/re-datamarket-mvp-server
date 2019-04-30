import * as express from 'express';
import { MarketplaceService } from './marketplace.service';

const router = express.Router();
interface OrderInput {
    buyer_id: number,
    seller_id: number,
    dataset_id: string,
    trade: number,
    bid: number,
    offer: number,
    pricing_unit: string,
    order_timestamp: string
};

const marketplaceService= new MarketplaceService();
router.get('/', (req, res) => {
  return marketplaceService.getAllDatasets().then(datasets => {
            if( datasets == null ) {
                return res.status(404).send("resource not found");
            } else {
                return res.status(200).send(datasets);
            }
        }).catch(() => {
             return res.status(500).send("unknown server error"); //TODO: Introduce better error handling
            });
});

router.get('/dataset/:assetid', (req, res, next) => {
    return marketplaceService.getAdataset(req.params.assetid).then(datasets => {
            if( datasets == null ) {
                return res.status(404).send("resource not found");
            } else {
                return res.status(200).send(datasets);
            }
        }).catch(() => {
             return res.status(500).send("unknown server error"); 
            });
});
router.get('/search', (req, res) => {
    let country = '';
    let region = '';
    let terms = '';
    if (req.query.country !== undefined) {
        country = req.query.country.toLowerCase();
    }
    if (req.query.region !== undefined) {
        region = req.query.region.toLowerCase();
    }
    if (req.query.terms !== undefined) {
        terms = req.query.terms.toLowerCase();
    } else {
        return res.status(404).send("no search terms")
    }
    return marketplaceService.getDataFields(country, region, terms).then (datasets => {
        if (datasets == null ) {
            return res.status(404).send("resource not found");
            } else {
                return res.status(200).send(datasets);
            }
        }).catch(() => {
            return res.status(500).send("unknown server error"); 
        });
  });

  router.post('/order/submit', (req, res) => {
    let draft_order:OrderInput = req.body;
    console.log(req.body);
    draft_order['id'] = -1;

    console.log (draft_order);
    return marketplaceService.submitOrder(draft_order).then (result => {
            if (result == 'redis_err' || result == 'q_err') {
                if (result == 'redis_err')
                    return res.status(500).send("redis error");
                else 
                    return res.status(500).send("queue error");
            } else {
                    return res.send(result); // ok return result
            }
         }).catch(() => {
            return res.status(500).send("server error"); 
        });
  });
  router.get('/order/list/:userid', (req, res) => {
    if (req.params.userid == null) {
        res.send(0)
    }
    return marketplaceService.getUserOrders(req.params.userid).then (orders => {
        if (orders == null) {
            return res.status(400).send("query failed.");
            } else {
                return res.status(200).send(orders);
            }
        }).catch(() => {
            return res.status(500).send("unknown server error"); 
        });
  });

export default router;
