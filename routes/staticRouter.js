import express from 'express';

import { getSignUpPage, getLoginPage, getProfilePage, handleUserLogOut, getProfileAnalyticsPage, getBillingInfoPage } from "../controllers/user.js";
import { getAdminAnalytics } from "../controllers/admin.js";
import { getHomePage } from '../controllers/url.js';
import { getPaymentPage } from '../controllers/payment.js';

import { restrictTo } from '../middlewares/auth.js';

const router = express.Router();

router.get('/signup', getSignUpPage);
router.get('/login', getLoginPage);

router.get('/', restrictTo(["NORMAL", "ADMIN"]), getHomePage);
router.get('/logout', restrictTo(["NORMAL", "ADMIN"]), handleUserLogOut);
router.get('/pricing', restrictTo(["NORMAL", "ADMIN"]), getPaymentPage);
router.get('/profile', restrictTo(["NORMAL", "ADMIN"]), getProfilePage);
router.get('/profile/analytics', restrictTo(["NORMAL", "ADMIN"]), getProfileAnalyticsPage);
router.get('/profile/billing', restrictTo(["NORMAL", "ADMIN"]), getBillingInfoPage);

//Admin Page!
//Can -> Look at users and their analytics
//Can Suspend and Ban Users (Suspension with a duration)
router.get('/admin-analytics', restrictTo(["ADMIN"]), getAdminAnalytics);

export default router;