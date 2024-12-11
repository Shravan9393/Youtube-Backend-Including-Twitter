import {Router} from "express";
import { createTweet, getUserTweets } from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Apply verifyJWT middleware to all routes in this file

router.use(verifyJWT);

router.route("/tweets").post(verifyJWT, createTweet);
router.route("/getusertweets/:twitterId").get(getUserTweets);    // here at the place of twitter id put the owner id you get it whenerver you created a tweet.
// router.route("/:tweetId").patch(updateTweet);
// router.route("/:tweetId").patch(deleteTweet);

export default router;