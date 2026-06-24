import { Request, Response } from "express";
import { bookingService } from "./booking.service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; email: string; name: string };
}

const bookSlot = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { availabilityId } = req.body;
    const data = await bookingService.bookSlotService(
      req.user!.id,
      availabilityId,
    );
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Enrolled in class successfully.",
      data,
    });
  },
);

const cancelBooking = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    await bookingService.cancelBookingService(req.user!.id, id as string);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Class booking cancelled successfully.",
    });
  },
);

const completeBooking = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { availabilityId } = req.body;
    await bookingService.completeBookingService(req.user!.id, availabilityId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Session marked as completed for all attendees.",
    });
  },
);

const getStudentBookings = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await bookingService.getStudentBookingsService(req.user!.id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      data,
    });
  },
);

const getTutorBookings = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await bookingService.getTutorBookingsService(req.user!.id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      data,
    });
  },
);

const getSlotStudents = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { availabilityId } = req.params;

    const data = await bookingService.getSlotStudentsService(
      req.user!.id,
      availabilityId as string,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Slot attendees retrieved successfully.",
      data,
    });
  },
);

const getStudentStats = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await bookingService.getStudentStatsService(req.user!.id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Student dashboard stats retrieved successfully.",
      data,
    });
  },
);

export const bookingController = {
  bookSlot,
  cancelBooking,
  completeBooking,
  getStudentBookings,
  getTutorBookings,
  getSlotStudents,
  getStudentStats,
};
