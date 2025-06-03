import { nanoid } from "nanoid";
import URL from "../models/url.js";
import User from "../models/user.js";

export async function generateShortUrl(req, res) {
    const body = req.body;
    if(!body || !body.url) {
        return res.status(400).render('error', {
            errorCode: 400,
            errorTitle: 'Invalid Request',
            errorMessage: 'Please enter a valid URL'
        });
    }

    try {
        const user = await User.findById(req.user._id);
        if(!user) {
            return res.status(404).render('error', {
                errorCode: 404,
                errorTitle: 'User Not Found',
                errorMessage: 'User account not found'
            });
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); 
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); 

        const urlCount = await URL.countDocuments({ 
            createdBy: req.user._id,
            createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        });
        
        if(user.plan === 'FREE' && urlCount >= 5) {
            return res.status(403).render('home', {
                showError: true,
                errorMessage: "Cannot generate more than 5 URLs a month! Upgrade your plan!"
            });
        } else if(user.plan === 'CORE' && urlCount >= 1000) {
            return res.status(403).render('home', {
                showError: true,
                errorMessage: "Cannot generate more than 1000 URLs a month! Upgrade your plan!"
            });
        }

        const shortID = nanoid(8);

        await URL.create({
            shortId: shortID,
            redirectURL: body.url,
            visitHistory: [],
            createdBy: req.user._id
        });

        const homePageUrlCount = await URL.countDocuments();
        const userCount = await User.countDocuments();

        return res.status(200).render('home', {
            id: shortID,
            userRole: user.role,
            userPlan: user.plan,
            urlCount: homePageUrlCount,
            userCount: userCount,
            baseUrl: process.env.BASE_URL
        });
    } catch(err) {
        console.log(err);
        return res.status(500).render('server_error');
    }
}

export async function redirectToOriginal(req, res) {
    const shortId = req.params.shortId;

    try {
        const entry = await URL.findOneAndUpdate(
            { shortId },
            { $push: { visitHistory: { timestamp: Date.now() } } },
            { new: true }
        );

        if (!entry) {
            return res.status(404).render('404');
        }

        return res.status(302).redirect(entry.redirectURL);
    } catch(error) {
        console.error('Redirect error:', error);
        return res.status(302).redirect('/');
    }
}

export async function getHomePage(req, res) {
    const user = req.user;
    if(!user) {
        return res.status(401).render('error', {
            errorCode: 401,
            errorTitle: 'Unauthorized',
            errorMessage: 'Please login to access this page'
        });
    }

    try {
        const userCount = await User.countDocuments();
        const userData = await User.findById(user._id);
        const linkCount = await URL.countDocuments();

        return res.status(200).render('home', {
            userCount: userCount,
            urlCount: linkCount,
            userRole: userData.role,
            userPlan: userData.plan,        
        });
    } catch(err) {
        console.log(err);
        return res.status(500).render('server_error');
    }
}