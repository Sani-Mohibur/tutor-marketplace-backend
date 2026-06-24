import { Router } from "express";
import multer from "multer";
import { profileController } from "./profile.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { USER_ROLES } from "../../constants/user.constants.js";

const profileRouter = Router();

// Multer config: memory storage, 10MB limit, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  },
});

// Both routes are protected; the controller automatically splits logic by role
profileRouter.get(
  "/me",
  requireAuth([USER_ROLES.STUDENT, USER_ROLES.TUTOR]),
  profileController.getMyProfile,
);

profileRouter.put(
  "/update",
  requireAuth([USER_ROLES.STUDENT, USER_ROLES.TUTOR]),
  profileController.updateMyProfile,
);

// Image upload route — accepts a single file field named "image"
profileRouter.post(
  "/upload-image",
  requireAuth([USER_ROLES.STUDENT, USER_ROLES.TUTOR]),
  upload.single("image"),
  profileController.uploadProfileImage,
);

export default profileRouter;
