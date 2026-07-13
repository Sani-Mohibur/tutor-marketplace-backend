import { Request, Response } from "express";
import { profileService } from "./profile.service.js";
import { USER_ROLES } from "../../constants/user.constants.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import ApiError from "../../errors/ApiError.js";
import { cloudinary } from "../../lib/cloudinary.js";
import { prisma } from "../../lib/prisma.js";

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

    if (req.body.name) {
      const user = await prisma.user.findUnique({ where: { id } });
      if (user?.isNameChanged) {
        throw new ApiError(400, "You have already used your one-time name change.");
      }
    }

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

const uploadTutorImages = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new ApiError(400, "No image files provided.");
    }

    const uploadPromises = req.files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "skillbridge/tutor-gallery",
            transformation: [{ width: 1280, height: 720, crop: "limit" }],
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result!.secure_url);
          },
        );
        uploadStream.end(file.buffer);
      });
    });

    const imageUrls = await Promise.all(uploadPromises);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Tutor gallery images uploaded successfully.",
      data: imageUrls,
    });
  },
);

const finalizeOauth = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.user!;
    const { role } = req.body;

    if (![USER_ROLES.STUDENT, USER_ROLES.TUTOR].includes(role)) {
      throw new ApiError(400, "Invalid role specified.");
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "User not found.");
    if (user.role !== "pending") {
      throw new ApiError(400, "User role is already finalized.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { role },
      });

      if (role === USER_ROLES.STUDENT) {
        await tx.studentProfile.create({ data: { userId: id } });
      } else if (role === USER_ROLES.TUTOR) {
        await tx.tutorProfile.create({ data: { userId: id } });
      }
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "OAuth user role finalized successfully.",
    });
  }
);

const getAuthMethods = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.user!;
    const accounts = await prisma.account.findMany({
      where: { userId: id },
      select: { providerId: true },
    });

    const providers = accounts.map((acc) => acc.providerId);
    
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Auth methods retrieved successfully.",
      data: { providers },
    });
  }
);

export const profileController = {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
  uploadTutorImages,
  finalizeOauth,
  getAuthMethods,
};
