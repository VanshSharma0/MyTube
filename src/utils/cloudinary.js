import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) {
            throw new Error("Invalid file path");
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        fs.unlinkSync(localFilePath)
        return response;
    }
    catch (error) {
        fs.unlinkSync(localFilePath);
        return null
    }
}

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
      if (!publicId) return null;
  
      // delete from cloudinary
      const response = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      console.log("Response: ", response);
      console.log("file delete successfully from cloudinar");
  
      return response;
    } catch (error) {
      console.log(error.message);
      return null;
    }
  };
  
  export { uploadOnCloudinary, deleteFromCloudinary };