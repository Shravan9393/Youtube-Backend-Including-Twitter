import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


// steps to register
// get user details from fronted
// details depend on whatever we have taken in user.model.js
// validation (like , user give valid email , or other thing) -not empty
// check if user already exists : check using username or email
// check for images , check fro avvatar
// if avialable then upload then on cloudaniry , avatar
// create user object - create entry in db
// remove password and refresh token fiels from response
// check for user creation
// return res


const registerUser  = asyncHandler( async (req,res) =>{
    // return res.status(200).json({
    //     message : "ok"
    // })

    const { fullName, email, username, password } = req.body;
    // console.log("fullName : ",fullName);
    console.log("email : ",email);
    // console.log("username : ",username);
    // console.log("password : ", password);
    // if(fullName === ""){
    //     throw new ApiError(400, "fullname is required");
    // }

    // insted of using above if we can use below 

    if(
        [fullName, email, username, password].some((field) =>
        field?.trim() === "" )
    ){
        throw new ApiError(404, "All fields are required");
    }

    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exist");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath); 

    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    // checking user made or not 

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering new user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registerd Successfully")
    )

})





export {registerUser}