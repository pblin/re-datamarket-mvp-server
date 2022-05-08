import * as express from 'express';
import { StripeServices } from './stripe.service';
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();
const router = express.Router();
// var AsyncRouter = require("express-async-router").AsyncRouter;
// var router = AsyncRouter();

const stripeServices = new StripeServices();
router.post('/charge/:userid', (req, res) => {
    console.log('CC charge...');
    logger.info(JSON.stringify(req.body));
    if (req.params.userid === undefined) 
      res.sendStatus(404).send("user id needed");
    return stripeServices.processCharge(req.params.userid, req.body).then ( (result) => {
      logger.info(result);
      if (result['status']['ref'] != "ok")
            res.status(500).send(result);
          else 
            res.status(200).send(result);
    })
  });
  
  export default router;