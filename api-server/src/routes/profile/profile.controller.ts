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
        }).catch((result) => {
            return res.sendStatus(500); //TODO: Introduce better error handling
            });
});

router.post('/verify/:email', (req, res) => {
    console.log("verify " + req.params.email);
    if (req.params.email == null || req.body.code == null ) {
        return res.sendStatus(404);
    }
    var profileService = new ProfileService();
    return profileService.verifyEmail(req.params.email, req.body.code).then((verification) => {
            return res.send(verification);
        }).catch((err) => {
            console.log(err);
             return res.status(500).send(false);
    });
});

router.post('/confirm/:which', (req, res) => {
    if (req.params.which) {
        return res.sendStatus(404);
    }
    var profileService = new ProfileService();
    let profile:ProfileData = req.body; 
    let email;
    if (req.params.which == 2) 
        email = profile.secondary_email; 
    else 
        email = profile.primary_email;
});

router.post('/', (req, res) => {
    let email = null;
    let profile:ProfileData = req.body;

    if (req.query.confirmEmail != undefined && req.query.confirmEmail=='2')
        email = profile.secondary_email;
    else
        email = profile.primary_email;
        
    var profileService = new ProfileService();
    // console.log ("email=" + email);
    return profileService.sendVerification(email, profile).then((profile) => {
                return profileService.upsertProfile(profile);
         }).then ((result) => {
            if (result != null)
                res.send(result);
            else 
                res.status(500).send("profile update error");
        }).catch((err) => {
            return res.status(500).send("service error");
    });
});

export default router;