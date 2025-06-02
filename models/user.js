import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: {
            validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
            message: props => `${props.value} is not a valid email!`
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters']
    },
    phone: {
        type: String,
        validate: {
            validator: (v) => /^[0-9]{10}$/.test(v),
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    address: {
        street: {
            type: String,
        },
        city: {
            type: String,
        },
        state: {
            type: String,
        },
        country: {
            type: String,
            default: 'India'
        },
        postalCode: {
            type: String,
            validate: {
                validator: (v) => /^[0-9]{6}$/.test(v),
                message: props => `${props.value} is not a valid postal code!`
            }
        }
    },
    role: {
        type: String,
        enum: ['NORMAL', 'ADMIN'],
        default: 'NORMAL'
    },
    plan: {
        type: String,
        enum: ['FREE', 'CORE', 'PREMIUM', 'OWNER'],
        default: 'FREE'
    },
    planActivated: {
        type: Boolean,
        default: false
    },
    planExpiry:{
        type: Date,
    },
    paymentMethods: [{
        provider: {
            type: String,
            default: 'Razorpay'
        },
        paymentId: {
            type: String,
        },
        lastUsed: {
            type: Date
        }
    }],
    status: {
        type: String,
        enum: ['ACTIVE', 'SUSPENDED', 'BANNED'],
        default: 'ACTIVE'
    },
    banDetails: {
        reason:{
            type: String,
        },
        bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    suspensionDetails: {
        reason: {
            type: String,
        },
        expiresAt: {
            type: Date,
        },
        suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    suspensionHistory: [{
        reason: {
            type: String,
        },
        suspendedAt: {
            type: Date,
        },
        suspendedUntil: {
            type: Date,
        },
        suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
}, { 
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.__v;
            return ret;
        }
    }
});

// Virtual for formatted address
userSchema.virtual('formattedAddress').get(function() {
    return `${this.address.street}, ${this.address.city}, ${this.address.state} - ${this.address.postalCode}, ${this.address.country}`;
});

// Virtual for checking if plan is active
userSchema.virtual('isPlanActive').get(function() {
    return this.planActivated && (!this.planExpiry || this.planExpiry > new Date());
});

const User = mongoose.model('user', userSchema);

export default User;