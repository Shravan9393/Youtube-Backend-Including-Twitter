import { Router } from "express";
import { getChannelStates, getChannelVideos } from "../controllers/dashbord.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/stats").get(getChannelStates);
router.route("/videos").get(getChannelVideos);

export default router;