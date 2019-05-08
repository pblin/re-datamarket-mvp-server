import * as express from 'express';
import {ProfileService, ProfileData} from "./profile.service";

const router = express.Router();
const profileService = new ProfileService();

/* GET users listing. */
router.get('/:email', (req, res, next) => {
    return profileService.getProfile(req.params.email).then((result) => {
            if(result.code > 0  && result.data != null) {
                let profile:ProfileData = result.data;
                res.send(profile);
            }
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

router.get('/verify/:email/:code', (req, res) => {
    if (req.params.email == null ||req.params.code == null ) {
        return false;
    }
    // console.log(req.params.email);
    // console.log(req.params.code);
    return profileService.verifyEmail(req.params.email, req.params.code).then((verification) => {
            return res.send(verification);
        }).catch((err) => {
             return res.status(500).send(false);
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

export default router;