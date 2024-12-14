import mongoose, { isValidObjectId } from "mongoose"; // Import mongoose and isValidObjectId for MongoDB operations
import { Video } from "../models/video.model.js"; // Import Video model
import { User } from "../models/user.model.js"; // Import User model
import { Like } from "../models/like.model.js"; // Import Like model
import { ApiError } from "../utils/ApiError.js"; // Import custom error handling utility
import { ApiResponse } from "../utils/ApiResponse.js"; // Import custom response utility
import { asyncHandler } from "../utils/asyncHandler.js"; // Import async handler utility for error handling
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js"; // Import cloudinary utilities for file uploads
import { Comment } from "../models/comment.model.js"

// Handler too get all videos
// Define the `getAllVideos` controller function, wrapped with `asyncHandler` to handle errors gracefully
const getAllVideos = asyncHandler(async (req, res) => {
  // Extract query parameters from the request for pagination, sorting, and filtering
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  // Log the user ID to the console for debugging purposes
  console.log(`The user id is ${userId}`);

  // Initialize an empty aggregation pipeline for MongoDB queries
  const pipeline = [];

  // Add a search stage to the pipeline if a query string is provided
  if (query) {
    pipeline.push({
      $search: {
        index: "search-videos", // Specify the search index to use
        text: {
          query: query, // The user's search input
          path: ["title", "description"], // Fields to search within
        },
      },
    });
  }

  // Check if a userId is provided and validate its format
  if (userId) {
    // If userId is invalid, throw a 400 Bad Request error
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }

    // Add a match stage to filter videos by the provided owner ID
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId), // Convert userId to ObjectId and match it
      },
    });
  }

  // Filter out unpublished videos by ensuring `isPublished` is true
  pipeline.push({ $match: { isPublished: true } });

  // Add a sort stage based on provided sorting criteria (sortBy and sortType)
  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1, // Sort in ascending or descending order
      },
    });
  } else {
    // Default sorting by `createdAt` in descending order if no criteria are provided
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  // Add a lookup stage to join video data with owner (user) details
  pipeline.push(
    {
      $lookup: {
        from: "users", // Specify the users collection to join with
        localField: "owner", // Field in the videos collection to match
        foreignField: "_id", // Field in the users collection to match
        as: "ownerDetails", // Output the result in this field
        pipeline: [
          {
            $project: {
              username: 1, // Include only the username field from the user document
              "avatar.url": 1, // Include only the avatar's URL
            },
          },
        ],
      },
    },
    {
      $unwind: "$ownerDetails", // Flatten the ownerDetails array into a single object
    }
  );


  // // Create an aggregation query using the constructed pipeline
  const videoAggregate = Video.aggregate(pipeline);

  // // Define options for pagination, including page number and items per page
  const options = {
    page: parseInt(page, 10), // Convert the page value to an integer
    limit: parseInt(limit, 10), // Convert the limit value to an integer
  };

  

  // Return a successful response with the paginated video data
  return res
    .status(200)
    .json(new ApiResponse(200, videoAggregate, "Videos fetched successfully"));
});


// Handler to publish a video
// Define the `publishAVideo` controller function, wrapped with `asyncHandler` for error handling
const publishAVideo = asyncHandler(async (req, res) => {
  // Extract the title and description from the request body
  const { title, description } = req.body;

  // Validate that required fields (title and description) are not empty
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required"); // Throw a 400 error if any field is empty
  }

  // Retrieve the video file and thumbnail paths from the uploaded files
  const videoFileLocalPath = req.files?.videoFile[0].path; // Local path for the video file
  const thumbnailLocalPath = req.files?.thumbnail[0].path; // Local path for the thumbnail

  // Validate that the video file path is present
  if (!videoFileLocalPath) {
    throw new ApiError(400, "videoFileLocalPath is required"); // Throw a 400 error if video file is missing
  }

  // Validate that the thumbnail file path is present
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnailLocalPath is required"); // Throw a 400 error if thumbnail is missing
  }

  // Upload the video file to Cloudinary
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  // Upload the thumbnail file to Cloudinary
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  // Validate that the video file was uploaded successfully
  if (!videoFile) {
    throw new ApiError(400, "Video upload failed");
  }

  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail upload failed");
  }

  // Create a new video document in the database with the provided details
  const video = await Video.create({
    title, // Set the title of the video
    description, // Set the description of the video
    duration: videoFile.duration, // Use the duration from the uploaded video file
    videoFile: {
      url: videoFile.url, // Set the URL of the uploaded video file
      publicId: videoFile.public_id, // Set the public ID for the video file
    },
    thumbnail: {
      url: thumbnail.url, // URL of the uploaded thumbnail
      publicId: thumbnail.public_id, // Public ID of the thumbnail
    },
    owner: req.user?._id, // Associate the video with the user who uploaded it
    isPublished: false, // Mark the video as unpublished by default
  });

  // Retrieve the newly created video from the database to confirm it was uploaded successfully
  const videoUploaded = await Video.findById(video._id);

  // Validate that the video was successfully created in the database
  if (!videoUploaded) {
    throw new ApiError(500, "Video upload failed. Please try again!"); // Throw a 500 error if video creation failed
  }

  // Send a success response with the uploaded video details
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video uploaded successfully"));
});


// Handler to get video by ID
const getVideoById = asyncHandler(async (req, res) => {
  // Get the videoId from request parameters
  const { videoId } = req.params;

  // Validate the videoID
  if (!isValidObjectId(videoId)) {
    throw new ApiError(404, "invalid videoId for getVideoBYID"); // Throw error if videoId is invalid
  }

  // Validate the user
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(404, "Invalid userId"); // Throw error if userId is invalid
  }

  // Aggregate query to fetch video details
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId), // Match video by ID
      },
    },
    {
      $lookup: {
        from: "likes", // Join with likes collection
        localField: "_id", // Field from the video
        foreignField: "video", // Field from the likes
        as: "likes", // Output array field
      },
    },
    {
      $lookup: {
        from: "users", // Join with users collection
        localField: "owner", // Field from the video
        foreignField: "_id", // Field from the user
        as: "owner", // Output array field
        pipeline: [
          {
            $lookup: {
              from: "subscriptions", // Join with subscriptions collection
              localField: "_id", // Field from the user
              foreignField: "channel", // Field from the subscriptions
              as: "subscribers", // Output array field
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers", // Count number of subscribers
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"], // Check if user is subscribed
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1, // Include username
              "avatar.url": 1, // Include avatar URL
              subscribersCount: 1, // Include subscribers count
              isSubscribed: 1, // Include subscription status
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes", // Count number of likes
        },
        owner: {
          $first: "$owner", // Get the first owner detail
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] }, // Check if user liked the video
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        "videoFile.url": 1, // Include video file URL
        title: 1, // Include title
        description: 1, // Include description
        views: 1, // Include views count
        createdAt: 1, // Include creation date
        duration: 1, // Include duration
        comments: 1, // Include comments
        owner: 1, // Include owner details
        likesCount: 1, // Include likes count
        isLiked: 1, // Include like status
      },
    },
  ]);

  // Validate if video was found
  if (!video) {
    throw new ApiError(500, "Video not found"); // Throw error if video not found
  }

  // Increment views if video fetched successfully
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1, // Increment views count
    },
  });

  // Add this video to user watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId, // Add video ID to user's watch history
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "video details fetched successfully")); // Return success response
});

// Handler to update video details
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params; // Get videoId from request parameters
  // Update video details like title, description, thumbnails
  const { title, description } = req.body;

  // Validate videoId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId"); // Throw error if videoId is invalid
  }

  // Validate required fields
  if (!(title && description)) {
    throw new ApiError(400, "title and description are required"); // Throw error if title or description is missing
  }

  const video = await Video.findById(videoId); // Fetch the video by ID

  // Validate if video exists
  if (!video) {
    throw new ApiError(404, "Video not found"); // Throw error if video not found
  }

  // Validate if the user is the owner of the video
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      404,
      "Unauthorized access, you are not the owner of the video"
    ); // Throw error if user is not the owner
  }

  // Delete the old thumbnail and update with the new one
  // const thumbnailToDelete = video.thumbnail.public_id; // Get public ID of the thumbnail to delete
  const thumbnailLocalPath = req.file?.path; // Get new thumbnail path

  let cloudinaryResult = null;
  // Validate thumbnail path
  if (thumbnailLocalPath) {
    cloudinaryResult = await uploadOnCloudinary(thumbnailLocalPath);
    // Delete old thumbnail from Cloudinary
    if (video.thumbnail?.public_id) {
      await deleteOnCloudinary(video.thumbnail.public_id);
    }
  }

  // Prepare updated fields
  const updateFields = {
    title,
    description,
  };

  if (cloudinaryResult) {
    updateFields.thumbnail = {
      public_id: cloudinaryResult.public_id,
      url: cloudinaryResult.url,
    };
  }

  // Update video details in the database
  // Update the video in the database
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateFields },
    { new: true } // Return the updated document
  );

  // Validate if video was updated successfully
  if (!updatedVideo) {
    throw new ApiError(500, "Failed to update video please try again"); // Throw error if update failed
  }


  return res
    .status(200)
    .json(new ApiResponse(200, { updatedVideo }, "Video updated successfully")); // Return success response
});

// Handler to delete a video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params; // Get videoId from request parameters
  // Validate videoId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId to delete video"); // Throw error if videoId is invalid
  }

  const video = await Video.findById(videoId); // Fetch the video by ID

  // Validate if video exists
  if (!video) {
    throw new ApiError(404, "No video found"); // Throw error if video not found
  }

  // Validate if the user is the owner of the video
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't delete this video as you are not the owner"
    ); // Throw error if user is not the owner
  }

  const videoDeleted = await Video.findByIdAndDelete(video?._id); // Delete the video from the database

  // Validate if video was deleted successfully
  if (!videoDeleted) {
    throw new ApiError(400, "Failed to delete the video please try again"); // Throw error if delete failed
  }

  // Delete associated files from Cloudinary
  await deleteOnCloudinary(video.thumbnail.public_id); // Delete thumbnail from Cloudinary
  await deleteOnCloudinary(video.videoFile.public_id, "video"); // Delete video file from Cloudinary

  // Delete all likes associated with the video
  await Like.deleteMany({
    video: videoId, // Remove likes for this video
  });

  // Delete all comments associated with the video
  await Comment.deleteMany({
    video: videoId, // Remove comments for this video
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "video deleted successfully")); // Return success response
});

// Handler to toggle the publish status of a video
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params; // Get videoId from request parameters

  // Validate videoId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id"); // Throw error if videoId is invalid
  }

  const video = await Video.findById(videoId); // Fetch the video by ID

  // Validate if video exists
  if (!video) {
    throw new ApiError(404, "Video not found"); // Throw error if video not found
  }

  // Validate if the user is the owner of the video
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "you can toggle publish status as you are not the owner"
    ); // Throw error if user is not the owner
  }

  // Toggle the publish status of the video
  const toggledVideoPublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video?.isPublished, // Toggle the isPublished field
      },
    },
    { new: true } // Return the updated document
  );

  // Validate if the toggle was successful
  if (!toggledVideoPublish) {
    throw new ApiError(500, "Failed to toggle video publish status"); // Throw error if toggle failed
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { isPublished: toggledVideoPublish.isPublished },
      "Video publish toggled successfully"
    ) // Return success response
  );
});

// Exporting the handlers for use in routes
export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
