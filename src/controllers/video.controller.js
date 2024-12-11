import mongoose from "mongoose";
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


// Handler to get all videos

const getAllVideos = asyncHandler( async(req, res) => {
    const {page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    // get all videos based on query , sort , pagination
});

// Handler to publis A video

const publisAVideo = asyncHandler( async(req, res) => {
    const { title, description} = req.body

    // get the video.
    // uplaod the video on cloudinary

    // create video
});

const getVideoById = asyncHandler( async(req, res) => {
    const { videoId } = req.params

    // get the video by Id
});

const updateVideo = asyncHandler( async(req, res) => {
    const { videoId } = req.params

    // update video details like title, description , thumbnails
    const {title, description, thumbnail } = req.body;
});


const deleteVideo = asyncHandler( async(req, res) => {
    const { videoId } = req.params

    // delete video
});

const togglePublishStatus = asyncHandler( async(req, res) =>{
    const { videoId } = req.params
});

export {
    getAllVideos,
    publisAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}

