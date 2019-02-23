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
          return schemaService.extractAndSaveDataFields(schemaItems, req.body.id);
        }
        }).then ( (result) => {
          if (result < 0 ) {
            res.status(500).send();
          } else {
            res.status(200).send();
          }
      }).catch ((err) => {res.status(500).send(err.messge); });
});

router.get('/:userid', (req, res, next) => {
    console.log (req.params.userid);
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

router.get('/', (req, res, next) => {
  return schemaService.getAllDatasetsOfUser(-1).then(datasets => {
    if( datasets < 0 ) {
        return res.status(404).send();
    } else {
        return res.status(200).send(datasets)
    }
}).catch(() => {
    return res.status(500).send(); //TODO: Introduce better error handling
})
});

export default router;
