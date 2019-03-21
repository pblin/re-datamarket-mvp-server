import * as express from 'express';
import { SchemaService } from './schema.service';

const router = express.Router();

const schemaService= new SchemaService();
router.post('/', (req, res) => {
      let returnSavedItem = null;
      let schemaItems = null;
      // console.log(req.body);
      try  {
        if (req.body.json_schema != "")
          schemaItems = JSON.parse(req.body.json_schema);
      }
      catch (e) {
        console.log(e);
        res.status(500).send(e.message);
      }
      if (req.body.stage == 3) { //in published stage
        console.log ("publish");
        return schemaService.saveDataset(req.body).then((result) => {
          if (result < 0) {
            res.status(500).send("grahQL error");
          } else {
            returnSavedItem = schemaService.deletePriorSavedFields(req.body.id);
            // console.log(returnSavedItem)
            return returnSavedItem;
          }
        }).then ((result) => { 
          if (result < 0) {
              res.status(500).send("DB operations error.");
          } else { 
            return schemaService.extractAndSaveDataFields(
                                schemaItems, 
                                req.body.id,
                                req.body.search_terms,
                                req.body.state_province,
                                req.body.country
                              );
          }
          }).then ( (result) => {
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
          console.log ("just save.");
          return schemaService.saveDataset(req.body).then((result) => {
            if (result < 0) {
              res.status(500).send("grahQL error");
            } else {
              res.status(200).send(result.toString());
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
      if( datasets < 0 ) {
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
  console.log (req.params.assetid);
  let userId=-100; //default value

  if (req.query.userid !== undefined) {
    userId=req.query.userid;
  }
  
  console.log (userId)
  return schemaService.getAdataset(req.params.assetid, userId).then(datasets => {
    if( datasets < 0 ) {
        return res.status(404).send("resource not found");
    } else {
        return res.status(200).send(datasets)
    }
}).catch(() => {
    return res.status(500).send("unknown server error."); //TODO: Introduce better error handling
})
});

router.get('/types', (req, res, next) => {
  console.log ('get types')
  return schemaService.getAvailableTypes().then(datatypes => {
    if( datatypes < 0 ) {
        return res.status(404).send("resource not found");
    } else {
        return res.status(200).send(datatypes)
    }
}).catch(() => {
    return res.status(500).send("unknown server error."); //TODO: Introduce better error handling
})
});
router.delete('/dataset/:assetid', (req, res, netxt) => {
    console.log (req.params.assetid);
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
