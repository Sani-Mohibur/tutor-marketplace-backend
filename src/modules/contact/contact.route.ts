import express from "express";
import { contactController } from "./contact.controller.js";
// import { requireRole } from "../../middlewares/authHandler.js";
// import { ROLES } from "../../constants/roles.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { USER_ROLES } from "../../constants/user.constants.js";

const router = express.Router();

// Public route to submit a contact form
router.post("/", contactController.createContact);

// Admin-only route to get all contacts
router.get(
  "/",
  requireAuth([USER_ROLES.ADMIN]),
  contactController.getAllContacts
);

export default router;
