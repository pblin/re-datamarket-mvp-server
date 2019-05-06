import * as express from 'express';
import {ProfileService} from "./profile.service";

const router = express.Router();
const profileService = new ProfileService();

/* GET users listing. */
router.get('/:email', (req, res, next) => {
    return profileService.getProfile(req.params.email).then((profile) => {
            if(profile == null) {
                return res.sendStatus(404);
            } else {
                return res.send(profile);
            }
        }).catch(() => {
            return res.sendStatus(500); //TODO: Introduce better error handling
            });
});

router.post('/', (req, res) => {
    return profileService.upsertProfile(req.body).then((profile) => {
        if (profile != null) 
            res.send(profile);
        else 
            res.sendStatus(404);
        }).catch((err) => {
             return res.sendStatus(500);
         });
});

router.get('/verification/:user_id', (req, res, next) => {
    return profileService.getVerificationInfo(req.params.user_id).then((verification) => {
            if(verification == null) {
                return res.sendStatus(404);
            } else {
                return res.send(verification);
            }
        }).catch(() => {
            return res.sendStatus(500); //TODO: Introduce better error handling
            });
});
router.post('/verification', (req, res) => {
    // console.log(req.body);
    return profileService.insertVerificationInfo(req.body).then((verification) => {
            if (verification != null) {
                return res.send(verification);
            }
            else {
                return res.sendStatus(404);
            }
        }).catch((err) => {
             return res.sendStatus(500);
        });
});

export default router;