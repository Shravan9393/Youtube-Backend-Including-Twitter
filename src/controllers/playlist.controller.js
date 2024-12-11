import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Playlist } from "../models/playlist.model.js";

// create a playlist.

const createPlayList = asyncHandler( async(req, res)=>{
    // get the name and description of the playlist

    const {name , description} = req.body;
});

// Handler to get the user playlist

const getUserPlayList = asyncHandler( async(req, res) => {
    
    // get the user id for their playlist

    const {userId} = req.params;

});

// Handler to get playList by id

const getUserPlayListById = asyncHandler(async(req, res)=>{
    const {PlaylistId} = req.params;
});

// Handler to add video in the playlist
const addVideoToPlayList = asyncHandler(async(req,res)=>{
    // we require playlist id of that playlist in which we have to 
    // add video , and we also require that video id
    const {PlaylistId, videoId} = req.params
});

// Handler to remove video from that playList

const removeVideoFromPlayList = asyncHandler(async(req, res) => {
  // we require playlist id of that playlist in which we have to
  // remove video , and we also require that video id

  const {PlaylistId , videoId} = req.params;
});

const deletePlayList = asyncHandler(async(req, res) => {
    // we require that playListId to remove that playList.
});

const updatePlayList = asyncHandler(async(req,res) => {
    // first we require playListId for the updation of that playList
    const {PlaylistId} = req.params;
    // then we require name and description for the updation of the playList
    const {name, description} = req.body 
});

// exporting all the above handler
export {
    createPlayList,
    getUserPlayList,
    getUserPlayListById,
    addVideoToPlayList,
    removeVideoFromPlayList,
    deletePlayList,
    updatePlayList,
}
