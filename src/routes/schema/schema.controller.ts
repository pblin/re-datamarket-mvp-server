import * as express from 'express';
import { SchemaService } from './schema.service';

const router = express.Router();

const schemaService= new SchemaService();
router.post('/', (req, res) => {

      let schemaItems = null;
      try  {
        schemaItems = JSON.parse(req.body.json_schema);
      }
      catch (e) {
        console.log(e);
        res.status(500).send(e.message);
      }
      return schemaService.saveDataset(req.body).then((result) => {
        if (result < 0) {
          res.status(500).send();
        } else {
          return schemaService.deletePriorSavedFields(req.body.id);
        }
      }).then ((result) => { 
        if (result < 0) {
          res.status(500).send();
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
          if (result < 0 ) {
            res.status(500).send();
          } else {
            res.status(200).send();
          }
      }).catch ((err) => {res.status(500).send(err.messge); });
});
router.get('/user/:userid', (req, res, next) => {
    // console.log (req.params.userid);
    return schemaService.getAllDatasetsOfUser(req.params.userid).then(datasets => {
      if( datasets < 0 ) {
          return res.status(404).send();
      } else {
          return res.status(200).send(datasets)
      }
  }).catch(() => {
      return res.status(500).send(); //TODO: Introduce better error handling
  })
});

router.get('/dataset/:assetid', (req, res, next) => {
  console.log (req.params.assetid);
  return schemaService.getAdataset(req.params.assetid).then(datasets => {
    if( datasets < 0 ) {
        return res.status(404).send();
    } else {
        return res.status(200).send(datasets)
    }
}).catch(() => {
    return res.status(500).send(); //TODO: Introduce better error handling
})
});

router.delete('/dataset/:assetid'), (req, res, netxt) => {
     console.log (req.params.assetid);
      return schemaService.deleteSchema(req.params.assetid).then(result=> {
      if( result  < 0 ) {
          return res.status(404).send();
      } else {
          return res.status(200).send(result)
      }
    }).then ( (result) => {
        if (result < 0) {
          res.status(500).send();
        } else {
          return schemaService.deletePriorSavedFields(req.params.assetid);
        }
    }).then ( (result) => {
          if (result < 0 ) {
            res.status(500).send();
          } else {
            res.status(200).send();
          }
      }).catch(() => {
      return res.status(500).send(); //TODO: Introduce better error handling
  })
}

export default router;
