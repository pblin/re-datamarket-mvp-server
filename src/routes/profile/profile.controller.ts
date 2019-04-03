import * as express from 'express';
import {ProfileService} from "./profile.service";

const router = express.Router();
const profileService = new ProfileService();

/* GET users listing. */
router.get('/:email', (req, res, next) => {
    return profileService.getProfile(req.params.email).then((profile) => {
            if(!profile['marketplace_customer'].length) {
                return res.sendStatus(404);
            } else {
                return res.send(profile['marketplace_customer'][0])
            }
        }).catch(() => {
            return res.sendStatus(500); //TODO: Introduce better error handling
             });
});

router.post('/', (req, res) => {
    return profileService.createProfile(req.body).then((profile) => {
            res.send(profile['insert_marketplace_customer'].returning[0])
        }).catch((err) => {
             return res.sendStatus(500);
            });
});

export default router;