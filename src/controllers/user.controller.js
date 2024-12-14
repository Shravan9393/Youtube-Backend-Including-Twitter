import { asyncHandler } from "../utils/asyncHandler.js"; // Wrapper to handle async errors in route handlers
import { ApiError } from "../utils/ApiError.js"; // Custom error handling class
import { User } from "../models/user.model.js"; // User model for interacting with user-related database operations
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // Utility function for uploading files to Cloudinary
import { ApiResponse } from "../utils/ApiResponse.js"; // Standardized API response class
import path from "path"; // Built-in module for file path manipulation
import jwt from "jsonwebtoken"; // Library for handling JSON Web Tokens
import { console } from "inspector"; // Node.js debugging tool (unnecessary here)
import { subscribe } from "diagnostics_channel"; // Node.js diagnostic channel (not used here)
import mongoose from "mongoose"; // MongoDB object modeling tool

// Function to generate access and refresh tokens for a user
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId); // Find user by ID
        const accessToken = user.generateAccessToken(); // Generate access token
        const refreshToken = user.generateRefreshToken(); // Generate refresh token
        
        user.refreshToken = refreshToken; // Save refresh token to user
        await user.save({ validateBeforeSave: false }); // Save user without validation

        return { accessToken, refreshToken }; // Return tokens
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};

// Handler for registering a new user
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body; // Extract user details from request body
    console.log("fullName : ", fullName);
    console.log("email : ", email);
    console.log("username : ", username);
    console.log("password : ", password);

    // Ensure all required fields are provided
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if user already exists by email or username
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    console.log("req.files : ", req.files);

    // Normalize avatar and cover image paths
    const avatarLocalPath = req?.files?.avatar?.[0]?.path
        ? path.normalize(req.files.avatar[0].path)
        : null;
    const coverImageLocalPath = req?.files?.coverImage?.[0]?.path
        ? path.normalize(req.files.coverImage[0].path)
        : null;

    if (!avatarLocalPath) {
        console.error("Avatar file is missing from req.files");
        throw new ApiError(400, "Avatar file is required");
    }

    // Upload avatar and cover image to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null;

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Create new user entry in the database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    // Retrieve the created user without password and refresh token
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering new user");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // 1.  get the data from req.body -> data

  const { email, username, password } = req.body; // Extract login credentials

  // 2. check you got the username or email  and password or not

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  if (!password) {
    throw new ApiError(400, "password is required");
  }

  // 3. Ensure you use await here

  const user = await User.findOne({
    $or: [{ username }, { email }],
  }); // Find user

  // 4. check it is registered user or not,

  if (!user) {
    throw new ApiError(404, "User does not exist, user not registered");
  }

  // 5. if already registered then validate username or email and password then only login
  //   validate password

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Generate tokens //  access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

// Handler for logging out a user

const logoutUser = asyncHandler(async (req, res) => {
  // Clear refresh token in the database

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

// Handler to refresh access token using the refresh token

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken; // Get refresh token from cookies or body

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request"); // No refresh token provided
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    ); // Verify refresh token

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token"); // User not found
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used"); // Mismatched or expired token
    }

    // Cookie options

    const options = {
      httpOnly: true,
      secure: true,
    };

    // Generate new tokens
    const { accessToken, newrefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newrefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Handler to change the current user's password

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body; // get the old and new passwords from the user

  const user = await User.findById(req.user?._id); // Find current user

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password"); // Validate old password
  }

  // if old password is correct the  Update the new  password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});


// Handler to get details of the current logged-in user

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

// Handler to update account details (name and email)

const updateAccountDetails = asyncHandler(async (req, res) => {
  // getting the details to update
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true } // Return the updated user document
  ).select("-password"); // Exclude password from response

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});


// Handler to update user's avatar

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; // Get avatar file path

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath); // Upload avatar to Cloudinary

  if (!avatar.url) {
    throw new ApiError(400, "Error while uplaoding on avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));

  // after updating avtar, delete the priviously
  // uplaoded avatar , write the utility function for this
  // assignment
});

// Handler to update user's cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path; // Get cover image file path

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uplaoding on coverImage");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"));
});

// Handler to get user channel profile by username

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscriberTo",
      },
    },
    {
      $addFields: {
        // Ensure the fields are arrays before applying $size
        subscribersCount: {
          $size: { $ifNull: ["$subscribers", []] },
        },
        channnelsSubscribedToCount: {
          $size: { $ifNull: ["$subscriberTo", []] },
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channnelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(400, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

// Handler to fetch user's watch history

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id), // Match the logged-in user by ID
      },
    },
    {
      $lookup: {
        from: "videos", // Join with the "videos" collection
        localField: "watchHistory", // Field in User collection
        foreignField: "_id", // Field in Videos collection
        as: "watchHistory", // Alias for the joined result
        pipeline: [
          {
            $lookup: {
              from: "users", // Join with the "users" collection
              localField: "owner", // Field in Videos collection
              foreignField: "_id", // Field in Users collection
              as: "owner", // Alias for the joined result
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1, // Include only specific fields
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner", // Get the first element from the owner array
              },
            },
          },
        ],
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      user[0].watchHistory, // Send watch history as response
      "watch Histroy fetched successfully"
    )
  );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
