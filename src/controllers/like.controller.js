import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const toggleVideoLike = asyncHandler (async(req,res) => {
  // TODO : toggle like on video
  // get the video id
  const { videoId } = req.params;

    //  validate the videoId
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId");
    }

    // check if the video is already liked or not
    const likedAlready = await Like.findOne({
        video : videoId,
        likedBy: req.user?._id,
    });

    // if liked already then after click unlike it
    if(likedAlready){
        await Like.findByIdAndDelete(likedAlready?._id);

        return res
        .status(200)
        .json(new ApiResponse(200, {isLiked: false}));
    }

    // if not liked , then like the video
    await Like.create({
        video: videoId,
        likedBy: req.user?._id,
    });

    return res
    .status(200)
    .json(new ApiResponse(200, {isLiked : true}));
});

const toggleCommentLike = asyncHandler(async(req,res)=>{
  // TODO : toggle like on comment
  const { commentId } = req.params;

  if(!isValidObjectId(commentId)){
    throw new ApiError(400, "Invalid comment Id");
  }

  const likedAlready = await Like.findOne({
    comment : commentId,
    likedBy: req.user?._id,
  });

  if(likedAlready){
    await Like.findByIdAndDelete(likedAlready?._id);

    return res
    .status(200)
    .json(new ApiResponse(200, {isLiked : false}));
  }

  await Like.create({
    comment : commentId,
    likedBy: req.user?._id,
  });

  return res
  .status(200)
  .json(new ApiResponse(200, {isLiked : true}));

});

const toggleTweetLike = asyncHandler(async(req,res)=>{
  // TODO : toggle like on a tweet
  const { tweetId } = req.params;

  if(!isValidObjectId(tweetId)){
    throw new ApiError(400, "Invalid tweetId");
  }

  const likedAlready = await Like.findOne({
    tweet : tweetId,
    likedBy: req.user?._id,
  });

  if(likedAlready){
    await Like.findByIdAndDelete(likedAlready?._id);

    return res
    .status(200)
    .json(new ApiResponse(200, {tweetId, isLiked : false}));
  }

  await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  return res
  .status(200)
  .json(new ApiResponse(200, {isLiked : true}));

});

const getLikedVideos = asyncHandler( async(req,res) =>{
    // TODO : get all the liked video of a user i think , i will 
    // corrrect it , when i am completing the project

    const likedVideosAggregate = await Like.aggregate([
        {
            $match: {
                likedBy : new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup:{
                from: "videos",
                localField : "video",
                foreignField: "_id",
                as : "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from : "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideo",
        },
        {
            $sort: {
                cretedAt : -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url" : 1,
                    "thumbnail.url" : 1,
                    owner : 1,
                    title : 1,
                    description : 1,
                    views : 1,
                    duration : 1,
                    createdAt : 1,
                    isPublished : 1,
                    ownerDetails : {
                        username : 1,
                        fullName : 1,
                        "avatar.url" : 1,
                    },
                },
            },
        }, 
    ]);


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            likedVideosAggregate,
            "liked videos fetched successfully"
        )
    );

});

export{
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}