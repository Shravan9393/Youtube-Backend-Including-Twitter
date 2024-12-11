import mongoose from "mongoose";
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Handler to get channel states

const getChannelStates = asyncHandler( async(req, res) => {
    // get the channel states like 
    // total video views,
    // total subscriber,
    // total videos,
    // total likes etc
});

const getChannelVideos = asyncHandler(async(req, res)=>{
    // get all the videos uplaoded by the channel
});

export {
    getChannelStates,
    getChannelVideos,
}