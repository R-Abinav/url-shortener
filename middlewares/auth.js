import { getUser } from "../service/auth.js";
import User from "../models/user.js";

export function checkForAuthentication(req, res, next){
    const tokenCookie = req.cookies?.token;
    req.user = null;

    if(!tokenCookie){
        return next();
    }
    
    //Validation
    try{
        const user = getUser(tokenCookie);
        req.user = user;
        return next();
    }catch (err){
        if (err.name === 'TokenExpiredError') {
            return res.status(401).render('error', {
                error: 'Token Expired!!'
            });
        }
        return res.status(401).render('error', {
            error: 'Authentication Failed: ' + err.message
        });
    }
}

export function restrictTo(roles){
    return function (req, res, next){
        if(!req.user){
            return res.redirect('/login');
        }
        
        if(!roles.includes(req.user.role)){
            return res.render('unauthorised');
        }

        return next();
    }
}

export async function checkUserStatus(req, res, next){
    if (!req.user){
        return next();
    }

    const user = await User.findById(req.user._id);
    
    if (user.status === 'SUSPENDED') {
        if(user.suspensionDetails.expiresAt > new Date()) {
            return res.status(403).render('suspended', {
                suspensionExpiry: user.suspensionDetails.expiresAt.toLocaleString(),
            });
        } else {
            user.status = 'ACTIVE';
            user.suspensionDetails = undefined;
            await user.save();
        }
    }
    
    if (user.status === 'BANNED') {
        return res.status(403).render('banned', {
            banReason: user.banDetails.reason,
        });
    }
    
    next();
}
