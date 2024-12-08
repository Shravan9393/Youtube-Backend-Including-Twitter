import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import path from "path";
import jwt from "jsonwebtoken";
import { console } from "inspector";

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken(); 
        
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, "Something went worng while generating refresh and access token");
    }
}

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
    console.log("fullName : ",fullName);
    console.log("email : ",email);
    console.log("username : ",username);
    console.log("password : ", password);
    // if(fullName === ""){
    //     throw new ApiError(400, "fullname is required");
    // }

    // insted of using above if we can use below 

    if(
        [fullName, email, username, password].some((field) => field?.trim() === "" )){
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if(existedUser){
        throw new ApiError(409, "User with email or username already exist");
    }

    console.log("req.files : ", req.files);

    // const avatarLocalPath = req?.files?.avatar?.[0]?.path;
    // // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // const coverImageLocalPath = req?.files?.coverImage?.[0]?.path || "";

    const avatarLocalPath = req?.files?.avatar?.[0]?.path? path.normalize(req.files.avatar[0].path) : null;
    const coverImageLocalPath = req?.files?.coverImage?.[0]?.path? path.normalize(req.files.coverImage[0].path) : null;

    console.log("Normalized avatarLocalPath: ", avatarLocalPath);
    console.log("Normalized coverImageLocalPath: ", coverImageLocalPath);




    if(!avatarLocalPath){
        console.error("Avatar file is missing from req.files");
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

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
    });

    // checking user made or not 

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering new user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registerd Successfully")
    );

});



const loginUser = asyncHandler(async (req, res) => {

  // 1.  get the data from req.body -> data

  const { email, username, password } = req.body;

  // 2. check you got the username or email  and password or not

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  if (!password) {
    throw new ApiError(400, "password is required");
  }

  // 3. Ensure you use await here

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // 4. check it is registered user or not,

  if (!user) {
    throw new ApiError(404, "User does not exist, user not registered");
  }

// 5. if already registered then validate username or email and password then only login
//   validate password

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Generate tokens //  access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});


const logoutUser = asyncHandler( async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {
                refreshToken : undefined,
            },
        },
        {
            new : true,
        },
    )

    const options = {
      httpOnly: true,
      secure: true,
    }

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged Out"))
});


const refreshAccessToken = asyncHandler( async (req, res) => {
    
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure : true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
          .status(200)
          .cookie("accessToken", accessToken, options)
          .cookie("refreshToken", newrefreshToken, options)
          .json(
            new ApiResponse(
                200,
                { accessToken, newrefreshToken },
                "Access token refreshed"
            ));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler( async(req, res) => {
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400, "Invalid old password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(new ApiResponse(200, {}, "Password changed successfully"))

});


const getCurrentUser = asyncHandler( async(req, res) => {
  return res
  .status(200)
  .json(200, req.user, "current user fetched successfully")
});

const updateAccountDetails = asyncHandler( async(req, res) => {
  const {fullName, email} = req.body

  if(!fullName || !email){
    throw new ApiError(400, "All fields are required");
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set : {
        fullName,
        email: email
      },
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated successfully"))

});

const updateUserAvatar = asyncHandler( async(req, res) => {
  const avatarLocalPath =  req.file?.path

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400, "Error while uplaoding on avatar")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));


});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uplaoding on coverImage");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"));

});



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};