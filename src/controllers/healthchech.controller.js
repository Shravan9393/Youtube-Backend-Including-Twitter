import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const healthCheck = asyncHandler( async(req, res) => {
    // build a health check
    // response that simply
    // return the ok status as json
    //  with a message
});

export {
    healthCheck
}