import { Router } from "express";
import {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply verifyJWT middleware to all routes in this file
router.use(verifyJWT);

// Define routes
router.route("/tweets").post(createTweet); // Create a tweet
router.route("/getusertweets/:twitterId").get(getUserTweets); // Fetch user tweets

// Update and delete routes for tweets based on tweetId
// router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);
router.route("/:tweetId").patch(updateTweet);
router.route("/:tweetId").delete(deleteTweet); // Route to delete a tweet

export default router;
