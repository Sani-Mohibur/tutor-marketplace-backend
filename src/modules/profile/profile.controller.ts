import { Request, Response } from "express";
import { profileService } from "./profile.service.js";
import { USER_ROLES } from "../../constants/user.constants.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import ApiError from "../../errors/ApiError.js";
import { cloudinary } from "../../lib/cloudinary.js";

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; email: string; name: string };
}

const getMyProfile = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id, role } = req.user!;
    const data =
      role === USER_ROLES.STUDENT
        ? await profileService.getStudent(id)
        : await profileService.getTutor(id);

    res.status(200).json({ success: true, data });
  },
);

const updateMyProfile = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id, role } = req.user!;
    const data =
      role === USER_ROLES.STUDENT
        ? await profileService.updateStudent(id, req.body)
        : await profileService.updateTutor(id, req.body);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Profile updated successfully.",
      data,
    });
  },
);

const uploadProfileImage = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.file) {
      throw new ApiError(400, "No image file provided.");
    }

    // Upload to Cloudinary using a stream from the buffer
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "skillbridge/profiles",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
          ],
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(req.file!.buffer);
    });

    // Update the user's image field in the database
    const data = await profileService.updateUserImage(
      req.user!.id,
      result.secure_url,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Profile image uploaded successfully.",
      data,
    });
  },
);

export const profileController = {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
};
