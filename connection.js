import mongoose from "mongoose";

async function connectMongoDB(url){
    return mongoose.connect(url);
}

export default connectMongoDB;