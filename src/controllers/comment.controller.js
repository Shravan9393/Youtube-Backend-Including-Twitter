import mongoose, { isValidObjectId , Schema } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";

import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const getVideoComments = asyncHandler(async (req, res) => {
  // Get all comments for a specific video

  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Check if the provided videoId is valid

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  // Find the video by its ID
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Use the MongoDB aggregation pipeline to fetch and manipulate data
  // This allows joining data from multiple collections and selecting specific fields
  const commentsAggregate = await Comment.aggregate([
    {
      // Match comments that belong to the specified video
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      // Perform a lookup to join the 'users' collection
      // This links the comment owner to their user details
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    // perform a lokkup to join the "like collection"
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    // The $addFields stage in the MongoDB aggregation pipeline is 
    // used to add new fields to the documents being processed
    {
        $addFields:{
            likesCount:{
                $size:"$likes"
            },
            owner: {
                $first: "$owner"
            },
            isLiked: {
                $cond: {
                    if:  {$in : [req.user?._id, "$likes.likedBy"]},
                    then: true,
                    else: false
                }
            }
        }
    },
    {
        $sort: {
            createdAt: -1
        }
    },
    {
    
      $project: {
        content:1,
        createdAt: 1,
        likesCount: 1,
        owner: {
            username : 1,
            fullName : 1,
            "avatar.url" : 1
        },
        isLiked:1
      },
    },
  ]);

  const options = {
    page : parseInt(page, 10),
    limit : parseInt(limit, 10)
  };

  const comments = await Comment.aggregatePaginate(
    commentsAggregate,
    options
  );

  return res
  .status(200)
  .json(new ApiResponse(200, {comments}, "Comments fetched successfully"));
});


const addComment = asyncHandler(async(req, res) => {
    // TODO : add a comment to a video
    
    // get the video Id from the video
    const { videoId } = req.params;

    // get the content for the comment

    const {content} = req.body;

    // validate the videoId
    if(!isValidObjectId(videoId)){
        throw new ApiError(404, "Invalid VideoId");
    }

    // check the content
    if(!content){
        throw new ApiError(404, "Content not found");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create({
        content,
        Video: videoId,
        owner: req.user?._id
    });

    if(!comment){
        throw new ApiError(500, "Failed to add comment please try again");
    }

    return res
    .status(201)
    .json(new ApiResponse(200, {comment}, "Comment add Successfuly"))
});

const updateComment = asyncHandler( async(req,res) => {
    // TODO : edit or update a comment

    // get the commentId from req.params
    const { commentId } = req.params;
    // get content to update
    const { content } = req.body;

    // check the content.

    if(!content){
        throw new ApiError(404, "content is required")
    }

    // get the comment by commentId

    const comment = await Comment.findById(commentId);

    // check you got the comment or not

    if(!comment){
        throw new ApiError(404, "Comment not found");
    }

    if(comment?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "only comment owner can edit their comment");
    }

    const updateComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content
            }
        },
        {new : true}
    );

    if(!updateComment){
        throw new ApiError(500, "Failed to edit comment please try again");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updateComment, "comment updated successfully")
    )


});

// Handler to delete a comment
const deleteComment = asyncHandler( async(req, res) => {
    // TODO : delete a comment
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(400, "comment not found");
    }

    if(comment?.owner.toString() !== req.user?._id){
        throw new ApiError(400, "only comment owner can delete their comment");
    }

    await Comment.findByIdAndDelete(commentId);

    return res
    .status(200)
    .json(
        new ApiResponse(200, { commentId }, "Comment deleted successfully")
    )

});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
}