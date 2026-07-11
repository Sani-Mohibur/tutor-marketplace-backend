import { Router } from "express";
import { tutorController } from "./tutor.controller.js";

const tutorRouter = Router();

// Public endpoint
tutorRouter.get("/search", tutorController.searchTutors);
tutorRouter.get("/featured", tutorController.getFeaturedTutors);
tutorRouter.get("/categories", tutorController.getAllCategories);
tutorRouter.get("/:id", tutorController.getTutorById);

export default tutorRouter;
