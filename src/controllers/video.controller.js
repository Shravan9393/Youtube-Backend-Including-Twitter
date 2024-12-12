import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";


// Handler to get all videos

const getAllVideos = asyncHandler( async(req, res) => {
  // get all videos based on query , sort , pagination
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  console.log(`The user id is ${userId}`);
  const pipeline = [];

  // for using Full Text based search we need to create a search index in mongoDB atlas
  // we can include field mapppings in search index eg.title, description, as well
  // Field mappings specify which fields within your documents should be indexed for text search.
  // this helps in seraching only in title, desc providing faster search results
  // here the name of search index is 'search-videos'

  if(query){
    pipeline.push({
        $search: {
            index : "search-videos",
            text: {
                query: query,
                path: ["title", "description"] //search only on title, description
            }
        }
    });
  }

  if(userId){
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid userId");
    }

    pipeline.push({
        $match: {
            owner : new mongoose.Types.ObjectId(userId)
        }
    });
  }

//   fetch videos only that are set isPublished as true
    pipeline.push({ $match: {isPublished : true}});

    // sortBy can be views, createdAt, duration
    // sortType can be ascending(-1), or descending(1)

    if(sortBy && sortType){
        pipeline.push({
            $sort: {
                [sortBy] : sortType === "asc" ? 1: -1
            }
        });
    }else {
        pipeline.push({$sort: {createdAt : -1}});
    }

    pipeline.push({
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField : "_id",
        as: "ownerDetails",
        pipeline: [
            {
                $project: {
                    username : 1,
                    "avatar.url" : 1
                },
            },
        ],
      },
    },
      {
        $unwind: "$ownerDetails"
      }
    );

    const   videoAggregate = Video.aggregate(pipeline);

    const options = {
        page : parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos fetched successfully"));
});


// Handler to publis A video

const publisAVideo = asyncHandler( async(req, res) => {
    const { title, description} = req.body

    if([title, description].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }

    // get the video.

    const videoFileLocalPath = req.files?.videoFile[0].path;
    const thumbnailLocalPath = req.files?.thumbnail[0].path;

    if(!videoFileLocalPath){
        throw new ApiError(400, "videoFileLocalPath is required");
    }

    if(!thumbnailLocalPath){
        throw new ApiError(400, "thumbnailLocalPath is required");
    }

    // uplaod the video on cloudinary
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!videoFile){
        throw new ApiError(400, "video file not found");
    }

    if(!thumbnail){
        throw new ApiError(400, "thumbnail not found");
    }

    // create video

    const video = await Video.create({
        title,
        description,
        duration : videpFile.duration,
        videoFile: {
            url : videoFile.url,
            publicId : thumbnail.public_id
        },
        owner : req.user?._id,
        isPublished : false
    });

    const videoUploaded = await Video.findById(video._id);

    if(!videoUploaded){
        throw new ApiError(500, "video uplaod filed please try again !!!");
    }

    return res
    .status(200)
    .json( new ApiResponse(200, video, "video uplaoded successfully"));
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

