import { Request, Response } from "express";
import { reviewService } from "./review.service.js";
import catchAsync from "../../utils/catchAsync.js";

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; email: string; name: string };
}

const add = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { bookingId, rating, comment } = req.body;
    const data = await reviewService.add({
      studentUserId: req.user!.id,
      bookingId,
      rating,
      comment,
    });
    res
      .status(201)
      .json({ success: true, message: "Review submitted successfully.", data });
  },
);

const getByTutor = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { tutorProfileId } = req.params;
    const data = await reviewService.getByTutor(tutorProfileId as string);
    res.status(200).json({ success: true, data });
  },
);

const getMyReviews = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await reviewService.getMyReviews(req.user!.id);
    res.status(200).json({ success: true, data });
  },
);

export const reviewController = {
  add,
  getByTutor,
  getMyReviews,
};
