import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createPlayList,
  updatePlayList,
  deletePlayList,
  addVideoToPlayList,
  removeVideoFromPlayList,
  getUserPlayListById,
  getUserPlayList,
} from "../controllers/playlist.controller.js";

const router = Router();

router.use(verifyJWT, upload.none()); // Apply verifyJWT middleware to all routes in this file

router.route("/createPlayList").post(createPlayList);

router
  .route("/:playlistId")
  .get(getUserPlayListById)
  .patch(updatePlayList)
  .delete(deletePlayList);

router.route("/add/:videoId/:playlistId").patch(addVideoToPlayList);
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlayList);

router.route("/user/:userId").get(getUserPlayList);

export default router;
