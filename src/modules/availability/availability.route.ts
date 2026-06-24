import { Router } from "express";
import { availabilityController } from "./availability.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { USER_ROLES } from "../../constants/user.constants.js";

const availabilityRouter = Router();

// 1. Public
availabilityRouter.get("/", availabilityController.getAllAvailabilities);
availabilityRouter.get(
  "/upcoming",
  availabilityController.getAllUpcomingAvailabilities,
);

// 2. Tutor Only - Manage slots
availabilityRouter.post(
  "/create-slot",
  requireAuth([USER_ROLES.TUTOR]),
  availabilityController.addAvailabilitySlot,
);
availabilityRouter.get(
  "/my-slots",
  requireAuth([USER_ROLES.TUTOR]),
  availabilityController.getTutorAvailabilities,
);
availabilityRouter.put(
  "/:id",
  requireAuth([USER_ROLES.TUTOR]),
  availabilityController.updateAvailabilitySlot,
);
availabilityRouter.delete(
  "/:id",
  requireAuth([USER_ROLES.TUTOR]),
  availabilityController.deleteAvailabilitySlot,
);

// 3. Students
availabilityRouter.get(
  "/student-upcoming",
  requireAuth([USER_ROLES.STUDENT]),
  availabilityController.getUpcomingAvailabilities,
);

export default availabilityRouter;
