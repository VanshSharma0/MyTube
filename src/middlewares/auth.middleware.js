import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // Check for token in cookies or Authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    // If no token is found, assume the user is logged out and handle it gracefully
    if (!token) {
      throw new ApiError(401, "Unauthorized request: No token provided. Please log in.");
    }

    let decodedToken;
    try {
      // Verify the token with the secret
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      // Handle specific JWT errors like expiration or invalid token
      if (error.name === "TokenExpiredError") {
        throw new ApiError(401, " Session expired. Please log in again." + "");
      }
      if (error.name === "JsonWebTokenError") {
        throw new ApiError(401, "Invalid token. Please log in again.");
      }
      throw new ApiError(401, "Token verification failed.");
    }

    // Fetch user from the database
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

    // If the user doesn't exist, return an invalid access token error
    if (!user) {
      throw new ApiError(401, "Invalid Access Token: User not found.");
    }

    // Attach the user object to the request
    req.user = user;
    next();
  } catch (error) {
    next(error); // Pass the error to the centralized error handler
  }
});
