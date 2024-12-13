import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { url } from "inspector";


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

// Handeler to get the videoByID

const getVideoById = asyncHandler( async(req, res) => {
  // get the videoId from param
  const { videoId } = req.params;

  // Validate the videoID
  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "invalid videoId for getVideoBYID");
  }

  //   validate the user

  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(404, "Invalid userId");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              "avatar.url": 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        "videoFile.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!video) {
    throw new ApiError(500, "Video not found");
  }

  // increment views if video fetched successfully

  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  // add this video to user watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "video details fetched successfully"));
    });

const updateVideo = asyncHandler( async(req, res) => {

    const { videoId } = req.params;
    // update video details like title, description , thumbnails
    const {title, description, thumbnail } = req.body;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId");
    }

    if(!(title && description)){
        throw new ApiError(400, "title and description are required");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found");
    }

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(404, "Unauthorized access, you are not the owner of the video")
    }

    // delete the old thumbanail and update the new one

    const thumbanailToDelete = video.thumbnail.public_id;
    const thumbnailLocalPath = req.file?.path;

    if(!thumbnailLocalPath){
        throw new ApiError(400, "thumbnail is required");
    }

    if(!thumbnail){
        throw new ApiError(400, "thumbnail not found");
    }

    const updateVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    public_id: thumbnail.public_id,
                    url: thumbnail.url
                }
            }
        },
        {new: true}
    );

    if(!updateVideo){
        throw new ApiError(500, "Failed to update video please try again");
    }

    if(updateVideo){
        throw deleteOnCloudinary(thumbanailToDelete);
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {updateVideo}, "Video updated successfully"));

});


const deleteVideo = asyncHandler( async(req, res) => {
    const { videoId } = req.params
    // delete video

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId to delete video")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "No video found");
    }

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "You can't delete this video as you are not the owner")
    }

    const videoDeleted = await Video.findByIdAndDelete(video?._id);

    if(!videoDeleted){
        throw new ApiError(400, "Failed tp delete the video please try again");
    }

    await deleteOnCloudinary(video.thumbnail.public_id);
    await deleteOnCloudinary(video.videoFile.public_id, "video");

    // delete video likes

    await Like.deleteMany({
        video: videoId
    })

    // delete video comments

    await Comment.deleteMany({
        video: videoId,
    })

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "video deleted successfully"));

});

const togglePublishStatus = asyncHandler( async(req, res) =>{
    const { videoId } = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found");
    }

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "you can toggle publish status as you are not the owner");
    }

    const toggledvideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        {new: true}
    );

    if(!toggledvideoPublish){
        throw new ApiError(500, "Failed to toggle video publish status");
    }


    return res
    .status(200)
    .json(
        new ApiResponse(200, {isPublished: toggledvideoPublish.isPublished}, "Video publish toggled successfully")
    )
});

export {
    getAllVideos,
    publisAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
}

