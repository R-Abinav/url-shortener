import express from 'express';
import dotenv from 'dotenv';

import urlRouter from './routes/url.js';
import getRouter from './routes/getUrl.js';
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
});

//Middleware
app.use(express.json());

//Routing
app.use("/url", urlRouter);
app.use("/", getRouter);

app.listen(PORT, () => {
    console.log(`Server has started on PORT: ${PORT}`);
})