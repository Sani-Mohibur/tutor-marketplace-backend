import { Router } from "express";
import { reviewController } from "./review.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { USER_ROLES } from "../../constants/user.constants.js";

const reviewRouter = Router();

// 1. Public Routes
reviewRouter.get("/tutor/:tutorProfileId", reviewController.getByTutor);
reviewRouter.get("/featured", reviewController.getFeatured);

// 2. Student Routes
reviewRouter.post(
  "/add",
  requireAuth([USER_ROLES.STUDENT]),
  reviewController.add,
);
reviewRouter.get(
  "/my-reviews",
  requireAuth([USER_ROLES.STUDENT]),
  reviewController.getMyReviews,
);

// 3. Admin Routes
reviewRouter.get(
  "/admin/all",
  requireAuth([USER_ROLES.ADMIN]),
  reviewController.getAll,
);
reviewRouter.patch(
  "/admin/:id/feature",
  requireAuth([USER_ROLES.ADMIN]),
  reviewController.toggleFeature,
);
reviewRouter.post(
  "/admin/placeholder",
  requireAuth([USER_ROLES.ADMIN]),
  reviewController.addPlaceholder,
);

export default reviewRouter;
