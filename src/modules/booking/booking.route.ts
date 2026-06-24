import { Router } from "express";
import { bookingController } from "./booking.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { USER_ROLES } from "../../constants/user.constants.js";

const bookingRouter = Router();

// 1. Students Only: Manage enrollments
bookingRouter.post(
  "/book",
  requireAuth([USER_ROLES.STUDENT]),
  bookingController.bookSlot,
);
bookingRouter.delete(
  "/cancel/:id",
  requireAuth([USER_ROLES.STUDENT]),
  bookingController.cancelBooking,
);
bookingRouter.get(
  "/student-list",
  requireAuth([USER_ROLES.STUDENT]),
  bookingController.getStudentBookings,
);
bookingRouter.get(
  "/student-stats",
  requireAuth([USER_ROLES.STUDENT]),
  bookingController.getStudentStats,
);

// 2. Tutors Only
bookingRouter.post(
  "/complete",
  requireAuth([USER_ROLES.TUTOR]),
  bookingController.completeBooking,
);
bookingRouter.get(
  "/tutor-list",
  requireAuth([USER_ROLES.TUTOR]),
  bookingController.getTutorBookings,
);
bookingRouter.get(
  "/slot-students/:availabilityId",
  requireAuth([USER_ROLES.TUTOR]),
  bookingController.getSlotStudents,
);

export default bookingRouter;
