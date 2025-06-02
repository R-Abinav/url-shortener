import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
//const sessionIdMap = new Map(); --> //Statefulll

dotenv.config();

const secret = process.env.JWT_SECRET;

export function setUser(user){
    return jwt.sign({
        _id: user._id,
        email: user.email,
        role: user.role
    }, secret, { expiresIn: '1h' });
}

export function getUser(token){
    if(!token) return null;
    return jwt.verify(token, secret);
}
    