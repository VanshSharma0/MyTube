import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateRefreshToken()
        const refreshToken = user.generateAccessToken() 

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Error generating tokens")
    }
}

const registerUser = asyncHandler( async(req,res) => {
    const {fullname, email, username , password} = req.body
    if(fullname == ""){
        throw new ApiError(400, "fullname is required")
    }

    if([fullname, email, username, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // let coverImageLocalPath;
    // if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    //     coverImageLocalPath = req.files.coverImage[0].path;
    // }


    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Error uploading images")
    }

    const user = await User.create({fullname, avatar: avatar.url, coverImage: coverImage?.url || "", email, username: username.toLowerCase(), password})
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Error registering user")
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"))
} )

const loginUser = asyncHandler( async(req,res) => {

    const {email, username, password} = req.body;

    if(!email && !username){
        throw new ApiError(400, "Email or username is required")
    }

    const user = await User.findOne({
        $or: [{email},{username}]
    })

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid Password")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User logged in successfully"))
})

const logoutUser = asyncHandler(async (req, res) => {
    // Ensure the user exists in the request (user might already be logged out or invalid)
    if (!req.user || !req.user._id) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User not logged in or invalid request"));
    }
  
    // Remove the refresh token from the user document
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: { refreshToken: 1 } // This removes the refreshToken field from the document
      },
      { new: true }
    );
  
    // Define cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Only transmit cookie over HTTPS
      sameSite: "Lax", // Adjust depending on the security requirements (Strict or None)
    };
  
    // Clear the accessToken and refreshToken cookies and return response
    return res
      .status(200)
      .clearCookie("accessToken", cookieOptions) // Clear accessToken cookie
      .clearCookie("refreshToken", cookieOptions) // Clear refreshToken cookie
      .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request: No token provided. Please log in.")
    }
try {
    
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = User.findById(decodedToken._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access token refreshed successfully"))
} catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
}
})

export { registerUser, loginUser, logoutUser, refreshAccessToken }