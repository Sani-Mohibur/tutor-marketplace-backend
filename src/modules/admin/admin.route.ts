import { Router } from "express";
import { adminController } from "./admin.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { USER_ROLES } from "../../constants/user.constants.js";

const adminRouter = Router();

// Secure all admin endpoints exclusively for users with the "admin" role
adminRouter.use(requireAuth([USER_ROLES.ADMIN as any]));

adminRouter.patch("/tutors/:id/featured", adminController.toggleTutorFeatured);

adminRouter.get("/stats", adminController.getDashboardStats);
adminRouter.get("/users", adminController.getAllUsers);
adminRouter.patch("/users/:userId/ban", adminController.toggleUserBan);

// --- New Tutor & Verification Control Channels ---
adminRouter.get("/tutors", adminController.getAllTutors);
adminRouter.patch("/tutors/:id/featured", adminController.toggleTutorFeatured);
adminRouter.patch(
  "/tutors/:id/verify",
  adminController.toggleTutorVerification,
);

// --- Platform Activity Master Logs ---
adminRouter.get("/bookings", adminController.getAllBookings);
adminRouter.get("/availabilities", adminController.getAllAvailabilities);

// --- Category Maintenance Endpoints ---
adminRouter.post("/categories", adminController.createCategory);
adminRouter.delete("/categories/:id", adminController.deleteCategory);

export default adminRouter;
