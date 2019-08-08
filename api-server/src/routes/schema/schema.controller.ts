import * as express from 'express';
import { SchemaService } from './schema.service';
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();

const router = express.Router();
const schemaService= new SchemaService();
router.post('/', (req, res) => {
    let returnSavedItem = null;
    let schema = null;
    let dataset = req.body;
    // console.log(req.body);
    try  {
        if (dataset.json_schema != null && dataset.json_schema !== '') {
          dataset['schema'] = JSON.parse(dataset.json_schema);
        }
    } catch (e) {
        logger.error(`JSON parse error ${e}`);
        res.status(500).send(e.message);
    }
    if (dataset.stage == 3) { //in published stage
        logger.info("publish");
        return schemaService.saveDataset(dataset).then ((result) => {
            if (result < 0 ){
                res.status(500).send("graphQL error");
            } else {
                return schemaService.getAdataset(dataset.id, 0);
            }
        }).then ( (result) => {
            if (result < 0 ) {
                res.status(500).send("graphQL error");
            } else {
                // console.log(result);
                res.status(200).send(result);
            }
        }).catch ((err) => {res.status(500).send(err.messge); });
    } else {
        // console.log ("just save.");
        return schemaService.saveDataset(dataset).then((result) => {
            if (result < 0) {
                res.status(500).send("grahQL error");
            } else {
                return schemaService.getAdataset(dataset.id, 0);
            }
        }).then ( (result) => {
            if (result < 0 ) {
                res.status(500).send("graphQL error");
            } else {
                res.status(200).send(result);
            }
        }).catch ((err) => {res.status(500).send(err.messge); });
    }
});

router.get('/user/:userid', (req, res, next) => {
    // console.log (req.params.userid);
    let stage = -1; //default, all
    if (req.query.stage !== undefined) {
      stage = req.query.stage;
    }
    return schemaService.getAllDatasetsOfUser(req.params.userid, stage).then(datasets => {
        if( datasets == null ) {
            return res.status(404).send("resource not found");
        } else {
            return res.status(200).send(datasets)
        }
    }).catch(() => {
      //TODO: Introduce better error handling
      return res.status(500).send("unknown server error."); 
  })
});

router.get('/dataset/:assetid', (req, res, next) => {
  // console.log (req.params.assetid);
  let userId=0; //default value

  if (req.query.userid !== undefined) {
    userId=req.query.userid;
  }
  
  // console.log (userId)
  return schemaService.getAdataset(req.params.assetid, userId).then(datasets => {
            if( datasets == null ) {
                return res.status(404).send("resource not found");
            } else {
                return res.status(200).send(datasets)
            }
        }).catch(() => {
        return res.status(500).send("unknown server error."); //TODO: Introduce better error handling
    })
});

router.get('/types', (req, res, next) => {
  // console.log ('get types')
  return schemaService.getAvailableTypes().then(datatypes => {
    if( datatypes ==null ) {
        return res.status(404).send("resource not found");
    } else {
        return res.status(200).send(datatypes)
    }
}).catch(() => {
    return res.status(500).send("unknown server error."); //TODO: Introduce better error handling
})
});

router.get('/topics', (req, res, next) => {
    // console.log ('get types')
    return schemaService.getAvailableTopics().then(topics => {
      if( topics ==null ) {
          return res.status(404).send("resource not found");
      } else {
          return res.status(200).send(topics)
      }
  }).catch(() => {
      return res.status(500).send("unknown server error."); //TODO: Introduce better error handling
  })
  });

router.get('/dataset/sample/:assetid', (req, res, next) => {
  logger.info ('sample for dataset: ' + req.params.assetid);
  return schemaService.previewSample(req.params.assetid).then(datasets => {
    if( datasets == null ) {
        return res.status(404).send("no sample found");
    } else {
        return res.status(200).send(datasets)
    }
  }).catch((err) => {
      return res.status(500).send("sample retrieval error. "  + err ); //TODO: Introduce better error handling
  })
});

router.get('/search', (req, res) => {
    let fields = '';
    let topics = '';
    let cities = '';
    let region = '';
    let country = '';
    let purchased_by = 0;
    let user_id = 0;
    let op = 'and';

    if (req.query.fields!= undefined) 
        fields = req.query.fields;

    if (req.query.topics != undefined) 
        topics = req.query.topics
    
    if (req.query.cities != undefined)
        cities = req.query.cities;
    
    if (req.query.region != undefined) 
        region = req.query.region;
    
    if (req.query.country != undefined) 
        country = req.query.country;

    if (req.query.purchased_by != undefined) 
        purchased_by = req.query.purchased_by;
    
    if (req.query.user_id != undefined) {
        user_id = req.query.user_id;
        purchased_by = user_id; // user can not query what others buy
    }

    if (req.query.op != undefined) {
        if (req.query.op.toLowerCase() != 'and')
            op = req.query.op.toLowerCase();
    }

    if (fields == '' && cities == '' && topics == '' && region == '' && country == '' && purchased_by==0)
        return res.status(404).send("no search criteria")

    return schemaService.searchDataset(purchased_by,user_id,fields,topics,cities,region,country,op).then(datasets => {
        if (datasets == null ) {
            return res.status(404).send("resource not found");
            } else {
                return res.status(200).send(datasets);
            }
        }).catch((err) => {
            logger.error(`search field error: ${err}`);
            return res.status(500).send("unknown server error"); 
        });
  });

  router.get('/object/search', (req, res) => {
    let fields = '';
    let city_county = '';
    let region = '';
    let country = '';
    let county = '';
    let purchased_by = 0;
    let user_id = 0;

    if (req.query.fields!= undefined) 
        fields = req.query.fields;

    if (req.query.city != undefined)
        city_county = req.query.city;
    
    if (req.query.region != undefined) 
        region = req.query.region;
    
    if (req.query.country != undefined) 
        country = req.query.country;
    
    if (req.query.county != undefined) 
        county = req.query.county;

    if (req.query.purchased_by != undefined) 
        purchased_by = req.query.purchased_by;
    
    if (req.query.user_id != undefined) {
        user_id = req.query.user_id;
        purchased_by = user_id; // user can not query what others buy
    }

    return schemaService.searchDatasetObject(purchased_by,user_id,fields,city_county,region,country).then(datasets => {
        if (datasets == null ) {
            return res.status(404).send("resource not found");
            } else {
                return res.status(200).send(datasets);
            }
        }).catch((err) => {
            logger.error(`search field error: ${err}`);
            return res.status(500).send("unknown server error"); 
        });
  });

router.delete('/dataset/:assetid', (req, res, netxt) => {
    // console.log (req.params.assetid);
    if (req.params.assetid === undefined) {
      return res.status(404).send("not found)")
    }
    return schemaService.deleteSchema(req.params.assetid).then( (result) => {
            if (result < 0 ) {
            res.status(500).send("graphQL server error.");
            } else {
            res.status(200).send(JSON.stringify(result));
            }
        }).catch(() => {
        return res.status(500).send("unknow server error."); //TODO: Introduce better error handling
    });
});

export default router;
