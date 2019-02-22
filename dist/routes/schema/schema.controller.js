"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const schema_service_1 = require("./schema.service");
const router = express.Router();
const schemaService = new schema_service_1.SchemaService();
router.post('/', (req, res) => {
    let schemaItems = null;
    try {
        schemaItems = JSON.parse(req.body.json_schema);
    }
    catch (e) {
        console.log(e);
        res.status(500).send(e.message);
    }
    return schemaService.saveDataset(req.body).then((result) => {
        if (result < 0) {
            res.status(500).send();
        }
        else {
            return schemaService.deletePriorSavedFields(req.body.id);
        }
    }).then((result) => {
        if (result < 0) {
            res.status(500).send();
        }
        else {
            return schemaService.extractAndSaveDataFields(schemaItems, req.body.id);
        }
    }).catch((err) => { res.status(500).send(err.messge); });
});
exports.default = router;
//# sourceMappingURL=schema.controller.js.map