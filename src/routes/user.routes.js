// Importing required modules and functions

import { Router } from "express"; // Express Router for defining routes
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

// Creating an instance of Router

const router = Router();

// Route to handle user registration

router.route("/register").post(
  upload.fields([
    {
      name: "avatar", // Field name for uploading user avatar
      maxCount: 1, // Allow only one file for avatar
    },
    {
      name: "coverImage", // Field name for uploading cover image
      maxCount: 1, // Allow only one file for cover image
    },
  ]),
  registerUser // Controller to handle the registration logic
);

// Route to handle user login

router.route("/login").post(loginUser);

// Secured route to handle user logout
router.route("/logout").post(verifyJWT, logoutUser);

// Route to refresh access tokens

router.route("/refresh-token").post(refreshAccessToken);

// Secured route to change the current user's password

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

// Secured route to fetch details of the current user

router.route("/current-user").get(verifyJWT, getCurrentUser);

// Secured route to update user account details

router.route("/update-account").patch(verifyJWT, updateAccountDetails);

// Secured route to update the user's avatar image

router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

// Secured route to update the user's cover image

router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

  // Secured route to fetch a user's channel profile by username

router.route("/c/:username").get(verifyJWT, getUserChannelProfile);

// Secured route to fetch the user's watch history

router.route("/history").get(verifyJWT, getWatchHistory);

// Exporting the router to be used in the main application file

export default router;
