import { Request, Response } from "express";
import { tutorService } from "./tutor.service.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiError from "../../errors/ApiError.js";
import sendResponse from "../../utils/sendResponse.js";

const searchTutors = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    // 1. Extract query params and normalize categories into a string array
    const {
      search,
      categories,
      minPrice,
      maxPrice,
      minRating,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    let parsedCategories: string[] | undefined = undefined;
    if (typeof categories === "string") {
      parsedCategories = [categories];
    } else if (Array.isArray(categories)) {
      parsedCategories = categories as string[];
    }

    // 2. Pass the cleanly structured filters to your service
    const data = await tutorService.searchTutors(
      {
        search: search as string | undefined,
        categories: parsedCategories,
        minPrice: minPrice as string | undefined,
        maxPrice: maxPrice as string | undefined,
        minRating: minRating as string | undefined,
      },
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as "asc" | "desc" | undefined,
      },
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Tutors retrieved successfully.",
      meta: data.meta,
      data: data.data,
    });
  },
);

const getFeaturedTutors = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await tutorService.getFeaturedTutors();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Featured tutors retrieved successfully.",
      data,
    });
  },
);

const getAllCategories = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await tutorService.getAllCategories();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Categories retrieved successfully.",
      data: data,
    });
  },
);

const getTutorById = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await tutorService.getTutorById(id as string);

    if (!data) {
      throw new ApiError(404, "Tutor profile not found.");
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Tutor profile retrieved successfully.",
      data: data,
    });
  },
);

export const tutorController = {
  searchTutors,
  getFeaturedTutors,
  getAllCategories,
  getTutorById,
};
