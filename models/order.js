import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    //Razorpay
    razorpay_order_id: {
        type: String,
        unique: true
    },
    razorpay_payment_id: {
        type: String,
    },
    razorpay_signature: {
        type: String,
    },

    //Payment
    amount: {
        type: Number,
        required: true
    },
    amount_paid: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    receipt: {
        type: String,
    },
    payment_method: {
        type: String,
    },

    //Status
    status: {
        type: String,
        enum: ['created', 'attempted', 'paid', 'failed'],
        default: 'created'
    },

    //User
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plan: {
        type: String,
        required: true
    }
}, { timestamps: true });
  
const Order = mongoose.model('order', orderSchema);

export default Order;
