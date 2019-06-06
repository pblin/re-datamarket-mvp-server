import * as express from 'express';
import { SchemaService } from './schema.service';
import { LogService } from '../../utils/logger';
const logger = new LogService().getLogger();

const router = express.Router();
const schemaService= new SchemaService();
router.post('/', (req, res) => {
      let returnSavedItem = null;
      let schema = null;
      // console.log(req.body);
      try  {
        if (req.body.json_schema != null && req.body.json_schema !== '') {
          schema = JSON.parse(req.body.json_schema);
        }
      }
      catch (e) {
        logger.error(`JSON parse error ${e}`);
        res.status(500).send(e.message);
      }
      if (req.body.stage == 3) { //in published stage
        logger.info("publish");
        return schemaService.saveDataset(req.body).then((result) => {
          if (result < 0) {
            res.status(500).send("grahQL error");
          } else {
            logger.info("delete source_of_field for existing data");
            return schemaService.deletePriorSavedFields(req.body.id);
          }
        }).then ((result) => { 
          if (result < 0 ) {
              res.status(500).send("DB operations error.");
          } else { 
              logger.info("extract and save data fields");
              return schemaService.extractAndSaveDataFields(
                                  schema, 
                                  req.body.id,
                                  req.body.search_terms,
                                  req.body.state_province,
                                  req.body.country
                                );
              }
          }).then ((result) => {
            if (result < 0 ){
                res.status(500).send("graphQL error");
            } else {
                return schemaService.getAdataset(req.body.id, 0);
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
          return schemaService.saveDataset(req.body).then((result) => {
            if (result < 0) {
                res.status(500).send("grahQL error");
            } else {
                return schemaService.getAdataset(req.body.id, 0);
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

router.delete('/dataset/:assetid', (req, res, netxt) => {
    // console.log (req.params.assetid);
    if (req.params.assetid === undefined) {
      return res.status(404).send("not found)")
    }
    return schemaService.deleteSchema(req.params.assetid).then(result=> {
      if( result  < 0 ) {
          return res.status(404).send("not found");
      } else {
          return schemaService.deletePriorSavedFields(req.params.assetid);
      }
  }).then ( (result) => {
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
