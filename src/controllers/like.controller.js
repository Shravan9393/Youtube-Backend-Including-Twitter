import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const toggleVideoLike = asyncHandler (async(req,res) => {
    const {videoId} = req.params
    // TODO : toggle like on video
});

const toggleCommentLike = asyncHandler(async(req,res)=>{
    const {commentId} = req.params
    // TODO : toggle like on comment
});

const toggleTweetLike = asyncHandler(async(req,res)=>{
    const {tweetId} = req.params
    // TODO : toggle like on a tweet
});

const getLikedVideos = asyncHandler( async(req,res) =>{
    // TODO : get all the liked video of a user i think , i will 
    // corrrect it , when i am completing the project
});

export{
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}