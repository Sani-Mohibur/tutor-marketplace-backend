import { Router } from "express";
import { reviewController } from "./review.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { USER_ROLES } from "../../constants/user.constants.js";

const reviewRouter = Router();

// 1. Public Route
reviewRouter.get("/tutor/:tutorProfileId", reviewController.getByTutor);

// 2. Student Route
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

export default reviewRouter;
