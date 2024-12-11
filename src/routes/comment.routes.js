import { Router } from "express";
import {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment, 
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply verifyJWT middleware to all routes in this file

router.use(verifyJWT);

router.route("/:videoId").get(getVideoComments);
router.route("/:videoId").post(addComment);
router.route("/c/:commentId").delete(deleteComment);
router.route("/c/:commentId").patch(updateComment);

export default router;