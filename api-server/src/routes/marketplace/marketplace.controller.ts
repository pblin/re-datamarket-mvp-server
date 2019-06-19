import * as express from 'express';
import { MarketplaceService } from './marketplace.service';
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();

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
        }).catch((e) => {
             return res.status(500).send("unknown server error");
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
    let region = '';
    let terms = '';
    let cities = '';
    let topics = '';

    if (req.query.region != undefined) 
        region = req.query.region;
    
    if (req.query.terms != undefined) 
        terms = req.query.terms;
    
    if (req.query.topics != undefined) 
        topics = req.query.topics;
    
    if (req.query.cities != undefined) 
        topics = req.query.cities;
    
    if (region == '' && terms == '' && cities == '' && topics == '')
        return res.status(404).send("no search criteria")
    return marketplaceService.searchDataset(topics,terms,cities,region).then (datasets => {
        if (datasets == null ) {
            return res.status(404).send("resource not found");
            } else {
                return res.status(200).send(datasets);
            }
        }).catch((err) => {
            logger.error(`marketplace search dataset error: ${err}`);
            return res.status(500).send("unknown server error"); 
        });
  });

  router.post('/order/submit', (req, res) => {
    let draft_order:OrderInput = req.body;
    // console.log(req.body);
    draft_order['id'] = -1;

    logger.info(`draft order = ${draft_order}`);
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
    logger.info(`order list for ${req.params.userid}`);
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
