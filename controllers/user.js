import User from "../models/user.js";
import URL from "../models/url.js";
import Order from "../models/order.js";

import { setUser } from "../service/auth.js";

import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

export function getSignUpPage(req, res) {
    return res.status(200).render('signup');
}

export function getLoginPage(req, res) {
    return res.status(200).render('login');
}

export async function getBillingInfoPage(req, res) {
    try {
        const user = req.user;
        if(!user) {
            return res.status(401).render('error', {
                errorCode: 401,
                errorTitle: 'Unauthorized',
                errorMessage: 'Please login to access billing information'
            });
        }

        const userData = await User.findById(user._id);
        if(!userData) {
            return res.status(404).render('error', {
                errorCode: 404,
                errorTitle: 'User Not Found',
                errorMessage: 'User account not found'
            });
        }

        const orderDetails = await Order.find({ createdBy: user._id });

        return res.status(200).render('billing', {
            userData: userData,
            orderDetails: orderDetails
        });
    } catch(err) {
        console.log(err);
        return res.status(500).render('server_error');
    }
}

export async function getProfilePage(req, res) {
    try {
        const user = req.user;
        if(!user) {
            return res.status(401).render('error', {
                errorCode: 401,
                errorTitle: 'Unauthorized',
                errorMessage: 'Please login to view profile'
            });
        }

        const data = await User.findById(user._id);
        if(!data) {
            return res.status(404).render('error', {
                errorCode: 404,
                errorTitle: 'User Not Found',
                errorMessage: 'User account not found'
            });
        }

        const linksByUserCount = await URL.find({createdBy: user._id}).countDocuments();

        const planData = {
            free: {
                linkCreation: "5 URLs per month!",
                analytics: "Basic analytics",
                customDomains: "No custom domain!",
                support: "Community Support",
            },
            core: {
                linkCreation: "1000 URLs per month!",
                analytics: "Advanced analytics",
                customDomains: "1 custom domain!",
                support: "Priority Support",
            },
            premium: {
                linkCreation: "Unlimited URLs",
                analytics: "Advanced analytics",
                customDomains: "Unlimited custom domain!",
                support: "24/7 Support",
            },
            owner: {
                linkCreation: "Unlimited URLs",
                analytics: "Advanced and Admin Analytics",
                customDomains: "Unlimited custom domain!",
                support: "24/7 Support",
            }
        }

        return res.status(200).render('profile', {
            userLinksCount: linksByUserCount,
            userData: data,
            plan: planData
        });
    } catch(err) {
        console.log(err);
        return res.status(500).render('server_error');
    }
}

export async function editPersonalDetails(req, res) {
    try {
        const user = req.user;
        if(!user) {
            return res.status(401).json({ 
                success: false,
                error: "User not authenticated!" 
            });
        }
        
        const updates = req.body;
        const updateOps = {};
    
        Object.keys(updates).forEach(key => {
            if(key.includes('.')) {
                const [parent, child] = key.split('.');
                updateOps[key] = updates[key];
            } else {
                updateOps[key] = updates[key];
            }
        });

        const result = await User.updateOne(
            { _id: user._id },
            { $set: updateOps }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false,
                error: "User not found" 
            });
        }

        return res.status(200).json({ 
            success: true,
            message: 'Profile updated successfully',
            modifiedCount: result.modifiedCount
        });

    } catch(err) {
        console.log(err);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
}

export async function verifyForEditSecurityDetails(req, res) {
    try {
        const user = req.user;
        if(!user) {
            return res.status(401).json({ 
                error: "User not authenticated!" 
            });
        }
        
        const userData = await User.findById(user._id);
        if(!userData) {
            return res.status(404).json({ 
                error: "User not found" 
            });
        }

        const { password } = req.body;
        
        let isMatch = false;
        if(password === userData.password) {
            isMatch = true;
        }

        return res.status(200).json({ valid: isMatch });
    } catch(err) {
        return res.status(500).json({ 
            error: "Internal server error" 
        });
    }
}

export async function editSecurityDetails(req, res) {
    try {
        const user = req.user;
        if(!user) {
            return res.status(401).json({ 
                success: false,
                error: "User not authenticated!" 
            });
        }

        const updates = req.body;
        let newUpdate = {};
        newUpdate.password = updates.newPassword;

        const result = await User.updateOne(
            { _id: user._id },
            { $set: newUpdate }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false,
                error: "User not found" 
            });
        }

        return res.status(200).json({ 
            success: true,
            message: 'Profile updated successfully',
            modifiedCount: result.modifiedCount
        });

    } catch(err) {
        console.log(err);
        return res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
}

export async function getProfileAnalyticsPage(req, res) {
    try {
        const user = await User.findById(req.user._id);
        if(!user) {
            return res.status(404).render('error', {
                errorCode: 404,
                errorTitle: 'User Not Found',
                errorMessage: 'User account not found'
            });
        }

        const userUrls = await URL.find({ createdBy: user._id })
            .sort({ createdAt: -1 });

        if(!userUrls) {
            return res.status(404).render('error', {
                errorCode: 404,
                errorTitle: 'URLs Not Found',
                errorMessage: 'No URLs found for this user'
            });
        }

        let analyticsData;
        switch (user.plan) {
            case 'OWNER':
                analyticsData = userUrls.map(url => ({
                    shortId: url.shortId,
                    redirectURL: url.redirectURL,
                    totalClicks: url.visitHistory.length,
                    visitHistory: url.visitHistory.map(visit => ({
                        timestamp: new Date(visit.timestamp).toLocaleString(),
                        ipAddress: visit.ipAddress,
                        location: visit.location
                    })),
                    createdAt: url.createdAt
                }));
                break;
                
            case 'PREMIUM':
                analyticsData = userUrls.map(url => ({
                    shortId: url.shortId,
                    redirectURL: url.redirectURL,
                    totalClicks: url.visitHistory.length,
                    visitHistory: url.visitHistory.map(visit => ({
                        timestamp: new Date(visit.timestamp).toLocaleString(),
                        ipAddress: visit.ipAddress,
                        location: visit.location
                    })),
                    createdAt: url.createdAt
                }));
                break;
                
            case 'CORE':
                analyticsData = userUrls.map(url => ({
                    shortId: url.shortId,
                    redirectURL: url.redirectURL,
                    totalClicks: url.visitHistory.length,
                    createdAt: url.createdAt
                }));
                break;
                
            default: 
                analyticsData = userUrls.map(url => ({
                    shortId: url.shortId,
                    redirectURL: url.redirectURL,
                    createdAt: url.createdAt
                }));
        }

        return res.status(200).render('analytics', {
            userData: user,
            userPlan: user.plan,
            analyticsData: analyticsData,
            baseUrl: `${req.protocol}://${req.get('host')}`
        });
    } catch(err) {
        console.log("Error while fetching the urls! :", err);
        return res.status(500).render('server_error', {
            error: err.message,
        });
    }
}

export async function handleUserSignUp(req, res) {
    const { email, name, phone, street, city, state, country, postcode, password } = req.body;
    
    if(!email || !name || !phone || !street || !city || !state || !country || !postcode || !password) {
        return res.status(400).render('error', {
            errorCode: 400,
            errorTitle: 'Invalid Input',
            errorMessage: 'All fields are required'
        });
    }

    try {
        await User.create({
            name,
            email, 
            password,
            phone,
            address: {
                street,
                city,
                state,
                country,
                postalCode: postcode
            }
        });

        return res.status(200).json({ 
            success: true,
            message: "Account created successfully!"
        });

    } catch(err) {
        console.log(err);

        //Check for duplicate key error (MongoDB error code 11000)
        if (err.code === 11000) {
            const duplicateField = Object.keys(err.keyPattern)[0];
            return res.status(409).json({
                success: false,
                error: `There already exists a ${duplicateField} in our database. Please choose something else.`
            });
        }
        
        //For all other errors, return server error
        return res.status(500).render('server_error', {
            error: err.message,
        });
    }
}

export async function handleUserLogin(req, res) {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({
            email,
            password,
        });

        if(!user) {
            return res.status(401).render('login', {
                error: "Invalid Username or Password!"
            });
        }

        const token = setUser(user);
        res.cookie('token', token);
        return res.status(200).redirect("/");

    } catch(err) {
        console.log(err);
        return res.status(500).render('server_error', {
            error: err.message,
        });
    }
}

export async function handleUserLogOut(req, res) {
    try{
        res.clearCookie('token', {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });
        
        if (req.session) {
            req.session.destroy();
        }
        
        res.set('Cache-Control', 'no-store');
        
        return res.redirect('/login');
    }catch(err){
        console.error('Logout error:', err);
        return res.status(500).redirect('/login?error=logout_failed');
    }
}

export async function handleDeleteAccount(req, res) {
    try {
        const { password } = req.body;
        const user = req.user;
        
        if(!user) {
            return res.status(401).json({ 
                error: 'Not Authenticated' 
            });
        }

        const userData = await User.findById(user._id);
        if (!userData) {
            return res.status(404).json({ 
                error: 'User not found' 
            });
        }

        if(password === userData.password) {
            await URL.deleteMany({createdBy: user._id });
            await Order.deleteMany({createdBy: user._id});
            await User.deleteOne({ _id: user._id });

            return res.status(200).json({ 
                success: true
            });
        } else {
            return res.status(403).json({
                error: "Incorrect password!"
            });
        }
    } catch(err) {
        return res.status(500).render('server_error',{ 
            error: "Internal server error" 
        });
    }
}

export async function handleEmailSending(req, res) {
    try {
        const { fname, lname, email, subject, message } = req.body;

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NODEMAILER_SENDER_EMAIL,
                pass: process.env.NODEMAILER_SENDER_AUTH,
            }
        });

        let mailOptions = {
            from: process.env.NODEMAILER_SENDER_EMAIL,
            to: process.env.NODEMAILER_SENDER_EMAIL,
            replyTo: email,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${fname} ${lname}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${email}</p>
                <p><strong>Message:</strong> ${subject}</p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p>This message was sent from your website contact form.</p>
            `
        };

        transporter.sendMail(mailOptions, function(error, info) {
            if(error) {
                console.log(error);
                return res.status(500).json({
                    error: "Could not send email!"
                });
            } else {
                console.log('Email Sent! ->', info.response);
                return res.status(200).json({
                    success: true,
                    message: "Email successfully sent!"
                });
            }
        });
    } catch(err) {
        console.log(err);
        return res.status(500).render('server_error',{
            error: "Internal server error"
        });
    }
}