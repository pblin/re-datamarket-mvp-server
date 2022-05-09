import * as express from 'express';
import { StripeServices } from './stripe.service';
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();

// const asyncRouter = require('route-async')
const asyncify = require('express-asyncify')
const router = asyncify(express.Router());
const stripeServices = new StripeServices();

router.get('/ping',  (req, res) => {
    res.status(200).send('i am herer!')
});

router.post('/charge/:userid', async (req, res) => {
    console.log('CC charge...');
    logger.info(JSON.stringify(req.body));
    if (req.params.userid === undefined) 
      res.sendStatus(404).send("user id needed");
  
    //   let result;
    //   try {
    //     result = await stripeServices.processCharge(req.params.userid, req.body);
    //     logger.info(result);
    //     if (result['status']['ref'] != "ok")
    //           res.status(500).send(result);
    //         else
    //           res.status(200).send(result);
    //   } catch (err){
    //     res.status(400).json({status:{ref:"failed", error:err}});
    //   }
  });
  
  export default router;