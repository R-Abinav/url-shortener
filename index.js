import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import ejs from 'ejs';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { checkForAuthentication, checkUserStatus } from './middlewares/auth.js';
import { handleUserLogOut } from './controllers/user.js';

import helmet from 'helmet';

import urlRouter from './routes/url.js';
import staticRouter from './routes/staticRouter.js';
import userRouter from './routes/user.js';
import paymentRouter from './routes/payment.js';
import adminRouter from './routes/admin.js';

import connectMongoDB from './connection.js';

const app = express();
dotenv.config();

const PORT = process.env.PORT;
if (!PORT) {
    console.error("Error: PORT is not defined in the environment variables.");
    process.exit(1);
}

const mongoURL = process.env.MONGO_URL;
if (!mongoURL) {
    console.error("Error: MONGO_URL is not defined in the environment variables.");
    process.exit(1);
}


//Connection
connectMongoDB(mongoURL)
.then(() => {
    console.log("MongoDB Connected!");
})
.catch((err) => {
    console.log("Error in connecting to MongoDB: ", err);
    process.exit(1);
});

//View Engine
app.set('view engine', 'ejs');
app.set("views", path.resolve("./views"));

//Expose the public folder
app.use(express.static('public'));

//app.use(helmet()) //Safer headers;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

app.use(cors());
app.use(cookieParser());
app.use(express.json());  //For parsing json
app.use(express.urlencoded({ extended: false })); //For parsing form data!
app.use(checkForAuthentication); //Run this always!

//logout route BEFORE checkUserStatus
app.get('/logout', handleUserLogOut);

app.use(checkUserStatus) //Checks if user is banned, suspended Or Active!

//Routing
app.use("/" ,staticRouter);
app.use("/" ,userRouter); 
app.use("/pricing", paymentRouter);
app.use("/url",urlRouter);
app.use("/admin-analytics", adminRouter);

//Vercel-compatible server setup
const startServer = async () => {
  try{
    const PORT = process.env.PORT || 8001;
    const mongoURL = process.env.MONGO_URL;
    
    if (!mongoURL) {
      throw new Error("MONGO_URL is not defined");
    }

    await connectMongoDB(mongoURL);
    console.log("MongoDB Connected!");

    return app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }catch(err){
    console.error("Server failed to start:", err);
    process.exit(1);
  }
};

//Export for Vercel serverless
module.exports = startServer().then(server => {
  const handler = app;
  handler.server = server; 
  return handler;
});

//For local development
if (process.env.NODE_ENV !== 'production') {
  startServer();
}