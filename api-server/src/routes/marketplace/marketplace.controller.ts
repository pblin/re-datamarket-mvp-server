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
    let terms = '';
    let cities = '';
    let topics = '';
    let region = '';
    let country = '';
    let purchased_by = 0;
    let user_id = 0;
    let op = 'and';
   
    if (req.query.terms != undefined) 
        terms = req.query.terms.toLowerCase();
    
    if (req.query.topics != undefined) 
        topics = req.query.topics.toLowerCase();
    
    if (req.query.cities != undefined) 
        cities = req.query.cities.toLowerCase();
    
    if (req.query.region != undefined) 
        region = req.query.region.toLowerCase();
   
    if (req.query.country != undefined) 
        country = req.query.country.toLowerCase();
    
    if (req.query.purchased_by != undefined) 
        purchased_by = req.query.purchased_by;
    
    if (req.query.user_id != undefined) 
        user_id = req.query.user_id;

    if (req.query.op != undefined) {
        if (req.query.op.toLowerCase() != 'and')
            op = req.query.op.toLowerCase();
    }

    if ( terms == '' && cities == '' && topics == '' && region == '' && country == '' && purchased_by == 0)
        return res.status(404).send("no search criteria")
    return marketplaceService.searchDataset(topics,terms,cities,region,country,purchased_by,user_id,op).then (datasets => {
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
    let draftOrderStr = JSON.stringify(draft_order);
    logger.info(`draft order = ${draftOrderStr}`);
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
