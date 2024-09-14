// require('dotenv').config({path: './env'});
import dotenv from 'dotenv';
import connectDB from './db/index.js';
import express from 'express';
import cors from "cors";
import cookieParser from "cookie-parser";



dotenv.config({ path: './env' });

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(cookieParser());


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