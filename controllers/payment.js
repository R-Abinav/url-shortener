import Razorpay from "razorpay";
import crypto from 'crypto';

import Order from "../models/order.js";
import User from "../models/user.js";

const razorpay = new Razorpay({
    key_id: process.env.RAZOR_TEST_KEY_ID,
    key_secret: process.env.RAZOR_TEST_KEY_SECRET
});

export async function getPaymentPage(req, res){
    try{
        const { plan } = req.query;
        if (!plan || !['CORE', 'PREMIUM'].includes(plan)) {
            return res.status(302).redirect('/pricing?error=invalid_plan');
        }

        const pricing = {
            CORE: 50,
            PREMIUM: 100,
        };

        const user = req.user;
        const userData = await User.findById(user._id);

        if(userData.plan === 'OWNER' || userData.role === 'ADMIN'){
            return res.status(200).render('admin_redirect', {
                title: "Admin Access",
                message: "You're an admin and already have full access to all features!",
                redirectUrl: '/',
                buttonText: 'Go to Admin Dashboard'
            });
        }

        return res.status(200).render('payment', {
            plan: plan,
            cost: pricing[plan],
            user: user,
            userName: user.name,
            userEmail: user.email,
            userContact: user.phone,
        });

    }catch(err){
        console.log(err);
        res.status(500).render('server_error');
    }
}

export async function handleOrderPayment(req, res){
    try{
        const { plan } = req.query;
        
        const user = req.user; 
        
        if (!user) {
            res.status(401).json({ error: "Authentication required" });
            return res.status(302).redirect('/login');
        }

        const body = req.body;

        const options = {
            ...body,
        }

        const razorpayOrder = await razorpay.orders.create(options);

        if(!razorpayOrder){
            return res.status(500).json({ error: "Error while creating order!" });
        }

        return res.status(200).json({
            success: true,
            order: razorpayOrder
        });

    }catch(err){
        console.log("Order creation error: ", err);
        return res.status(500).render('server_error');
    }
}

export async function validateOrderPayment(req, res){
   try{
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, receipt, plan } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).render('error', {
                errorCode: 400,
                errorTitle: 'Payment Verification Failed',
                errorMessage: 'Missing payment verification fields'
            });
        }

        const user = req.user;
        
        if (!user) {
            return res.status(401).render('error', {
                errorCode: 401,
                errorTitle: 'Authentication Required',
                errorMessage: 'Please login to complete payment'
            });
        }

        const sha = crypto.createHmac("sha256", process.env.RAZOR_TEST_KEY_SECRET);
        sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const digest = sha.digest("hex");

        if(digest !== razorpay_signature){
            return res.status(400).render('error', {
                errorCode: 400,
                errorTitle: 'Payment Verification Failed',
                errorMessage: 'Error during validation of payment! Please try again later!'
            });
        }
        
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        console.log("Payment:", payment);

        const amt = payment.amount/100;

        const order = await Order.create({
            razorpay_order_id: razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_signature: razorpay_signature,
            amount: amt,
            amount_paid: amt,
            currency: payment.currency,
            receipt: receipt,
            payment_method: payment.method,
            status: 'paid',
            $inc: {
                attempts: 1
            },
            createdBy: user._id,
            plan: plan
        })
        
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);

        try{
            const updatedUser = await User.findByIdAndUpdate(
                user._id,
                { $set: { 
                        plan: plan, 
                        planActivated: true, 
                        planExpiry: expiryDate 
                    }
                },
                { new: true }
            );
        
            if(!updatedUser){
                return res.status(404).render('error', {
                    errorCode: 404,
                    errorTitle: 'User Not Found',
                    errorMessage: 'User account not found while updating plan'
                });
            }
            
            return res.status(200).json({
                success: true,
                message: "Payment verified and plan activated successfully",
                order: {
                    id: order._id,
                    amount: order.amount_paid / 100,
                    plan: order.plan
                },
                user: {
                    plan: updatedUser.plan,
                    expiry: updatedUser.planExpiry,
                    isPlanActive: updatedUser.isPlanActive
                }
            });

        }catch(err){
            console.error("Plan update error:", err);
            return res.status(500).render('server_error');
        }
   }catch(err){
        console.error("Payment validation error:", err);
        return res.status(500).render('server_error');
   }
}