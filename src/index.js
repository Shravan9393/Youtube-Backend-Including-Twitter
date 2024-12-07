// require('dotenv').config({path : './env'})

import dotenv from "dotenv"

// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
import connectDB from "./db/index.js";
import {app} from "./app.js";


dotenv.config({
    path : './.env'
})


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`Server is running at port : ${process.env.PORT}`);
    })

})
.catch((err) => {
    console.log("Mongo db connection failed !!!",err);
})













/*

import express from "express"
const app = express()

// function connectDB(){
// }

// using like above function 
// use call type function
// immediate function in javaScript i.e IIFEs
// know as immediately invoked function expression
// use semicolon before using iife's beacuse cleaning purpose
// manlo phele line me koi colon nahi lagaya hoga 
// then error aa skata haii nh bhaii
// that's why

;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error",(error) => {
            console.log("ERROR : ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("ERROR : ",error)
        throw err
    }
})()

*/