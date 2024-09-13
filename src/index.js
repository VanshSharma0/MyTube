// require('dotenv').config({path: './env'});
import dotenv from 'dotenv';
import connectDB from './db/index.js';
import express from 'express';

dotenv.config({ path: './env' });

const app = express()

connectDB()
.then(() => {
    app.listen(process.env.PORT || 4000, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    })
})
.catch((error) => {
    console.log("Mongo DB connection failed !!!", error);
});

import userRouter from "./routes/user.routes.js";

// routes declaration

app.use("/api/v1/users", userRouter);
export { app }