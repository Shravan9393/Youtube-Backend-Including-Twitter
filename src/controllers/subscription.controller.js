import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async(req, res)=> {
    // get the channel id 
    const { channelId } = req.params;
    // toggle the subscription
});

// controller to return subscriber list of a channnel

const getUserChannelSubscriber = asyncHandler(async(req, res) => {
    const { channelId } = req.params
});

// controller to return channel list to which user has subscribed

const getSubscribedChannels = asyncHandler(async(req, res) => {
    const { subscriberId } = req.params
});

export {
    toggleSubscription,
    getUserChannelSubscriber,
    getSubscribedChannels
}