import { Router } from "express";
import { adminController } from "./admin.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { USER_ROLES } from "../../constants/user.constants.js";

const adminRouter = Router();

// Public endpoint for homepage statistics
adminRouter.get("/public-stats", adminController.getPublicStats);

// Public endpoint for featured categories
adminRouter.get("/featured-categories", adminController.getFeaturedCategories);

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
adminRouter.get("/payments", adminController.getAllPayments);

import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
});

// --- Category Maintenance Endpoints ---
adminRouter.get("/categories", adminController.getAllCategories);
adminRouter.post("/categories", upload.single("iconFile"), adminController.createCategory);
adminRouter.patch("/categories/:id", upload.single("iconFile"), adminController.updateCategory);
adminRouter.delete("/categories/:id", adminController.deleteCategory);

export default adminRouter;
