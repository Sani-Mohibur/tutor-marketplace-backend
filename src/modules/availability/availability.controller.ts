import { Request, Response } from "express";
import { availabilityService } from "./availability.service.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiError from "../../errors/ApiError.js";
import sendResponse from "../../utils/sendResponse.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
    name: string;
  };
}

const addAvailabilitySlot = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // Destructure the new optional fields alongside the required slot timestamp
    const {
      slot,
      title,
      subject,
      details,
      location,
      timeDuration,
      pricePerHour,
      paymentMethod,
    } = req.body;

    if (!slot) {
      throw new ApiError(400, "A valid date-time slot string is required.");
    }

    const data = await availabilityService.createAvailabilityService({
      userId: req.user!.id,
      slot,
      title,
      subject,
      details,
      location,
      timeDuration,
      pricePerHour,
      paymentMethod,
    });

    res.status(201).json({
      success: true,
      message: "Availability slot published successfully.",
      data,
    });
  },
);

const getAllAvailabilities = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { tutorId } = req.query;
    const data = await availabilityService.getAllAvailabilitiesService(
      tutorId as string,
    );

    res.status(200).json({ success: true, data });
  },
);

const getAllUpcomingAvailabilities = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { tutorId } = req.query;
    const data = await availabilityService.getAllUpcomingAvailabilitiesService(
      tutorId as string,
    );

    res.status(200).json({ success: true, data });
  },
);

// Student shows available slot he didn't book
const getUpcomingAvailabilities = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tutorId } = req.query;

    const data = await availabilityService.getUpcomingAvailabilitiesService(
      req.user!.id,
      tutorId as string,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Upcoming available slots retrieved successfully.",
      data,
    });
  },
);

const getTutorAvailabilities = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await availabilityService.getTutorAvailabilitiesService(
      req.user!.id,
    );

    res.status(200).json({ success: true, data });
  },
);

const updateAvailabilitySlot = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { slot, details, location } = req.body;

    if (!slot && details === undefined && location === undefined) {
      throw new ApiError(
        400,
        "At least one field (slot, details, or location) must be provided.",
      );
    }

    const data = await availabilityService.updateAvailabilityService(
      id as string,
      req.user!.id,
      { slot, details, location },
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Slot updated successfully.",
      data,
    });
  },
);

const deleteAvailabilitySlot = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    await availabilityService.deleteAvailabilityService(
      id as string,
      req.user!.id,
    );

    res
      .status(200)
      .json({ success: true, message: "Slot deleted successfully." });
  },
);

export const availabilityController = {
  addAvailabilitySlot,
  getAllAvailabilities,
  getTutorAvailabilities,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  getAllUpcomingAvailabilities,
  getUpcomingAvailabilities,
};
