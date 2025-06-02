import Order from "../models/order.js";
import URL from "../models/url.js";
import User from "../models/user.js";

import nodemailer from 'nodemailer';

export async function getAdminAnalytics(req, res){
    const user = req.user;
    if(!user){
        throw new Error("Not authenticated! No user found!");
    }

    try{
        const userData = await User.findById(user._id);

        const allUserData = await User.find({ plan: { $ne: 'OWNER' } });
        const allOrderData = await Order.find({});
        const allUrlData = await URL.find({});

        const userCount = allUserData.length;
        const premiumUsers = allUserData.filter(user => user.plan === 'PREMIUM').length;
        const urlCount = allUrlData.length;
        const totalRevenue = allOrderData.reduce((sum, order) => sum + order.amount, 0);

        return res.render('admin_analytics', {
            user: userData,
            userData: allUserData,
            urlData: allUrlData,
            orderData: allOrderData,
            userCount,
            premiumUsers,
            urlCount,
            totalRevenue,
            users: allUserData, 
            orders: allOrderData, 
            currentPage: 1,
            totalPages: 1
        });
    }catch(err){
        console.log(err);
        throw new Error("Error while getting data!");
    }
}

export async function suspendUser(req, res){
    try{
        const user = req.user;
        if(!user){
            res.render('server_error', {
                error: "There has been some error, Please retry after some time! Pssst You might not be authenticated!"
            });
        }

        const suspendUserId = req.params.userId;
        if(!suspendUserId){
            res.render('server_error', {
                error: "There has been some error, Please retry after some time!"
            });
        }

        const { duration, reason } = req.body;
        if(!duration || !reason){
            res.render('server_error', {
                error: "There has been some error, Please retry after some time!"
            });
        }

        const suspendUser = await User.findById(suspendUserId);
        if(!suspendUser){
            return res.status(404).render('server_error', {
                error: "User not found"
            });
        }

        const suspensionExpiresAt = calculateExpiryDate(duration);

        //Update details in DB and Send suspension mail!
        const update = {
            plan: 'FREE',
            status: "SUSPENDED",
            suspensionDetails: {
                reason: reason,
                expiresAt: suspensionExpiresAt,
                suspendedBy: user._id
            },
            $push: {
                suspensionHistory: {
                    reason: reason,
                    suspendedAt: new Date(),
                    suspendedUntil: suspensionExpiresAt,
                    suspendedBy: user._id
                }
            }
        };

        await User.findByIdAndUpdate(
            suspendUserId,
            update,
            { runValidators: true }
        );

        await URL.deleteMany({ createdBy: suspendUserId }); 

        //Send mail using nodemailer!
        const suspendedUserEmail = suspendUser.email;

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth:{
                user: process.env.NODEMAILER_SENDER_EMAIL,
                pass: process.env.NODEMAILER_SENDER_AUTH,
            }
        });
        
        let mailOptions = {
            from: process.env.NODEMAILER_SENDER_EMAIL,
            to: suspendedUserEmail,
            subject: 'Your Bibi Account Has Been Temporarily Suspended',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4361ee;">Account Suspension Notice</h2>
                <p>Dear User,</p>
                
                <p>Your Bibi account (<strong>${suspendedUserEmail}</strong>) has been temporarily suspended until <strong>${suspensionExpiresAt}</strong>.</p>
                
                <h4 style="margin-top: 20px;">During this period:</h4>
                <ul>
                    <li>All your existing shortened URLs will be inactive</li>
                    <li>Your premium plan has been downgraded to Free</li>
                    <li>You won't be able to create new shortened URLs</li>
                </ul>
                
                <p>After <strong>${suspensionExpiresAt}</strong>, your account will be automatically reinstated with Free plan privileges.</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #4361ee; margin: 20px 0;">
                    <strong>Reason:</strong> ${reason}
                </div>
                
                <p>If you believe this is a mistake, please contact our support team at <a href="mailto:${process.env.NODEMAILER_SENDER_EMAIL}">${process.env.NODEMAILER_SENDER_EMAIL}</a>.</p>
                
                <p>Sincerely,<br>The Bibi Team</p>
            </div>
            `
        };
        
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Suspension Email sent: ' + info.response);
            }
        });

        return res.redirect('/admin-analytics');

    }catch(err){
        console.error("Suspension error:", err);
        return res.redirect('/admin-analytics');
    }
}

function calculateExpiryDate(duration) {
    const now = new Date();
    switch (duration) {
        case '1h': return new Date(now.getTime() + 60 * 60 * 1000);
        case '1d': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case '1w': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case '1m': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        default: return new Date(now.getTime() + 24 * 60 * 60 * 1000); 
    }
}

export async function banUser(req, res){
    try{
        const user = req.user;
        if(!user){
            res.render('server_error', {
                error: "There has been some error, Please retry after some time! Pssst You might not be authenticated!"
            });
        }

        const banUserId = req.params.userId;
        if(!banUserId){
            res.render('server_error', {
                error: "There has been some error, Please retry after some time!"
            });
        }

        const { reason } = req.body;

        const banUser = await User.findById(banUserId);
        if(!banUser){
            return res.status(404).render('server_error', {
                error: "User not found"
            });
        }

        const update = {
            plan: 'FREE',
            status: "BANNED",
            banDetails: {
                reason: reason,
                bannedBy: user._id,
            }
        };

        await User.findByIdAndUpdate(
            banUserId,
            update,
            { runValidators: true }
        );

        //Delete the URLS!
        await URL.deleteMany({ createdBy: banUserId });

        //Send the mails!
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth:{
                user: process.env.NODEMAILER_SENDER_EMAIL,
                pass: process.env.NODEMAILER_SENDER_AUTH,
            }
        });
        
        let mailOptions = {
            from: process.env.NODEMAILER_SENDER_EMAIL,
            to: banUser.email,
            subject: 'Your Bibi Account Has Been Permanently Banned',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #f72585;">Account Termination Notice</h2>
                <p>Dear User,</p>
                
                <p>Your Bibi account (<strong>${banUser.email}</strong>) has been permanently banned due to violations of our Terms of Service.</p>
                
                <h4 style="margin-top: 20px; color: #f72585;">Immediate Effects:</h4>
                <ul>
                    <li>All your shortened URLs have been permanently deleted</li>
                    <li>Your account can no longer be accessed</li>
                    <li>Any active subscription has been canceled</li>
                </ul>
                
                <div style="background-color: #fff5f7; padding: 15px; border-left: 4px solid #f72585; margin: 20px 0;">
                    <strong>Reason:</strong> ${reason}
                </div>
                
                <p>This decision is final. Creating new accounts to circumvent this ban will result in immediate termination.</p>
                
                <p>If you believe this action was taken in error, you may contact our support team at 
                <a href="mailto:${process.env.NODEMAILER_SENDER_EMAIL}">${process.env.NODEMAILER_SENDER_EMAIL}</a> within 7 days to appeal.</p>
                
                <p>Sincerely,<br>The Bibi Team</p>
            </div>
            `
        };
        
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Ban Email sent: ' + info.response);
            }
        });

        // console.log("Success daw!");
        return res.redirect('/admin-analytics');

    }catch(err){
        console.error("Banning error:", err);
        return res.redirect('/admin-analytics');
    }
}