import express from 'express';
import { handleUserSignUp, handleUserLogin, handleDeleteAccount, handleEmailSending, editPersonalDetails, editSecurityDetails, verifyForEditSecurityDetails } from "../controllers/user.js";

const router = express.Router();

router.post('/signup', handleUserSignUp);
router.post('/login', handleUserLogin);

router.post('/send-email', handleEmailSending);

router.post('/delete-account', handleDeleteAccount);


router.patch('/profile/edit-personal', editPersonalDetails);

router.post('/profile/verify-password', verifyForEditSecurityDetails);
router.patch('/profile/edit-security', editSecurityDetails);

export default router;
