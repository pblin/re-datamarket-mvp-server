import * as express from 'express';
import {ProfileService} from "./profile.service";

const router = express.Router();
const profileService = new ProfileService();

/* GET users listing. */
router.get('/:email', (req, res, next) => {
    return profileService.getProfile(req.params.email).then((result) => {
            if(result.code > 0  && result.data != null) 
                res.send(result.data);
            else {
                if (result.code < 0)
                    res.sendStatus(500);
                else
                    res.sendStatus(404);
            }
        }).catch(() => {
            return res.sendStatus(500); //TODO: Introduce better error handling
            });
});

router.post('/', (req, res) => {
    return profileService.upsertProfile(req.body).then((result) => {
            if (result != null) 
                res.send(result);
            else 
                res.sendStatus(404);
        }).catch((err) => {
             return res.sendStatus(500);
         });
});

router.get('/verify', (req, res) => {
    // console.log(req.body);
    return profileService.verifyEmail(req.query.email, req.query.code).then((verification) => {
            return res.send(verification);
        }).catch((err) => {
             return res.status(500).send(false);
        });
});

export default router;