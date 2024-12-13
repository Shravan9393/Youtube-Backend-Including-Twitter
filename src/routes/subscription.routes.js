import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscriber,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/c/:channelId").get(getUserChannelSubscriber)
router.route("/c/:channelId").post(toggleSubscription);

router.route("/u/:subscriberId").get(getSubscribedChannels);

export default router;
