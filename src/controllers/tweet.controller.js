import mongoose, {isValidObjectId} from "mongoose";
import { Tweet } from "../models/tweet.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

// 1. let the user to create some tweets 

const createTweet = asyncHandler( async(req,res) =>{
    // TODO create tweet

    // we require content for tweet creation.
    const {content} = req.body;
    
    console.log(content);
    
    // check we got the content or not

    if(!content){
        throw new ApiError((400), "Content required")
    }
    
    // validate current user
    if (!(req.user || req.user._id)){
        throw new ApiError(401, "Unauthorized");
    } 

    // find the current user
    const user = await User.findById(req.user?._id);

    // check user avialable or not
    if(!user){
        throw new ApiError(404, "User not found");
    }

    // Creates a new document in the Tweet collection in the database using the provided data.

    const tweet = await Tweet.create({
        content,
        owner : user._id,      
    });

    return res
    .status(200)
    .json(new ApiResponse(200 ,{ tweet }, "Content created successfully"));

});

// Handler to get tweets of a specific user by their twitterId
const getUserTweets = asyncHandler(async (req, res) => {
  // Extract twitterId from request parameters
  const { twitterId } = req.params;

  console.log(`the is twitter is : ${twitterId}`)

  // Validate the twitterId to ensure it is a valid MongoDB ObjectId
  if (!isValidObjectId(twitterId)) {
    throw new ApiError(400, "Bad request, Invalid twitter id");
  }

  // Using the MongoDB aggregation pipeline to fetch and manipulate data
  // This allows us to join data from multiple collections and project fields
  const tweets = await Tweet.aggregate([
    {
      // Match tweets where the 'owner' field matches the provided twitterId
      $match: {
        owner: new mongoose.Types.ObjectId(twitterId), // Convert twitterId to ObjectId
      },
    },
    {
      // Use $lookup to join data from the 'users' collection
      $lookup: {
        from: "users", // The collection to join with
        localField: "owner", // The field in the Tweet collection
        foreignField: "_id", // The field in the User collection
        as: "ownerdetails", // Name of the resulting field to store joined data
      },
    },
    {
      // Project specific fields from the tweet and user data
      $project: {
        content: 1, // Include the content field from the Tweet collection
        createdAt: 1, // Include the createdAt field from the Tweet collection
        "ownerdetails.fullName": 1, // Include the fullName field from the joined user data
        "ownerdetails.username": 1, // Include the username field from the joined user data
      },
    },
  ]);

  // Check if tweets were found, and handle the case where no tweets exist
  if (!tweets.length) {
    throw new ApiError(404, "No tweets found for the provided user");
  }

  // Return the fetched tweets as a response with a success message
  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

// Handler to  update the tweetes of a specific user using their twitter id 
const updateTweet = asyncHandler( async(req,res) => {
    // get the content and tweet ID
    const { content } = req.body         //get the content from body
    const { tweetId } = req.params       // get the tweetId from params
  
    // check content is available or not

    if(!content){
      throw new ApiError(400, "content is required");
    }

    // is tweetId is valid or not

    if(!isValidObjectId(tweetId)){
      throw new ApiError(400, "Invalid tweetId");
    }

    // get the tweet using find by ID.

    const tweet = await Tweet.findById(tweetId)

    // check we got the tweet or not

    if(!tweet){
      throw new ApiError(404, "tweet not found");
    }

    // check that owner is accesssing the tweet to update
    // check that , the tweet you want to update , that twitter id is 
    // matches with the user requestiong to update the twee
    if(tweet?.owner.toString() !== req.user?._id.toString){
      throw new ApiError(400, "Only owner can edit their tweet");
    }

    // for the update tweet

    const newTweet = await Tweet.findByIdAndUpdate(
      tweetId,
      {
        $set: {
          content,
        },
      },
      {new : true}
    );

    // check new tweet is available or not
    if(!newTweet){
      throw new ApiError(500, "Failed to edit and update the tweet");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, newTweet, "Tweet udated successfully"));

});

// Hand;er to delete the tweets

const deleteTweet = asyncHandler (async(req,res) =>{
      const { tweetId } = req.params;

      // check tweeter id is vaild or not

      if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweetId");
      }

      // get the content from twiiter id

      const tweet = await Tweet.findById(tweetId);

      // check you got the tweet or not

      if(!tweet){
        throw new ApiError(404, "Tweet not found");
      }

      // check for  valid user
      if(tweet?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "owner can delet the tweet");
      }

      await Tweet.findByIdAndDelete(tweetId);

      return res
      .status(200)
      .json(new ApiResponse(200, {tweetId}, "Tweet Deleted successfully"));

});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet,
};