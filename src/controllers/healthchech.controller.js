import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js"
import { Tweet } from "../models/tweet.model.js";

const healthCheck = asyncHandler( async(req, res) => {
    // build a health check
    // response that simply
    // return the ok status as json
    //  with a message
    return res
    .status(200)
    .json(new ApiResponse(200, {message : "All ok" }, "ok"));

});

export {
    healthCheck,
}