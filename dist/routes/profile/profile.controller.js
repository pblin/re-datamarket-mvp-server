"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const profile_service_1 = require("./profile.service");
const router = express.Router();
const profileService = new profile_service_1.ProfileService();
/* GET users listing. */
router.get('/:email', (req, res, next) => {
    return profileService.getProfile(req.params.email).then((profile) => {
        if (!profile['marketplace_customer'].length) {
            return res.status(404).send();
        }
        else {
            return res.status(200).send(profile['marketplace_customer'][0]);
        }
    }).catch(() => {
        return res.status(500).send(); //TODO: Introduce better error handling
    });
});
router.post('/', (req, res) => {
    return profileService.createProfile(req.body).then((profile) => {
        res.status(200).send(profile['insert_marketplace_customer'].returning[0]);
    }).catch((err) => {
        return res.status(500).send();
    });
    res.status(200).send();
});
exports.default = router;
//# sourceMappingURL=profile.controller.js.map