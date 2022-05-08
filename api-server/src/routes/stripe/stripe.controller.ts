import * as express from 'express';
import { StripeServices } from './stripe.service';
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();
var router = express.Router();
// var AsyncRouter = require("express-async-router").AsyncRouter;
// var router = AsyncRouter();

router.get('/ping',  (req, res) => {
    res.status(200).send('i am herer!')
});

router.post('/charge/:userid', (req, res) => {
    console.log('CC charge...');
    logger.info(JSON.stringify(req.body));
    if (req.params.userid === undefined) 
      res.sendStatus(404).send("user id needed");
    var stripeServices = new StripeServices();
    return stripeServices.processCharge(req.params.userid, req.body).then ( (result) => {
      logger.info(result);
      if (result['status']['ref'] != "ok")
            res.status(500).send(result);
          else 
            res.status(200).send(result);
    })
  });
  
  export default router;