import { prisma } from "../../lib/prisma.js";
import { paginationHelper } from "../../utils/paginationHelper.js";

interface CreateReviewData {
  studentUserId: string;
  bookingId: string;
  rating: number;
  comment?: string;
}

const add = async ({
  studentUserId,
  bookingId,
  rating,
  comment,
}: CreateReviewData) => {
  // 1. Get student profile ID
  const student = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId },
  });
  if (!student) throw new Error("Student profile missing.");

  // 2. Verify completed booking exists for this student
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, studentProfileId: student.id, status: "completed" },
  });
  if (!booking) throw new Error("No completed booking found to review.");

  // Execute review creation and rating recalculation in a transaction
  return await prisma.$transaction(async (tx: any) => {
    // Save the new review
    const newReview = await tx.review.create({
      data: {
        studentProfileId: student.id,
        tutorProfileId: booking.tutorProfileId,
        bookingId,
        rating,
        comment: comment ?? null,
      },
    });

    // Aggregate all reviews for this tutor to calculate the average
    const aggregations = await tx.review.aggregate({
      where: { tutorProfileId: booking.tutorProfileId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const newAverageRating = aggregations._avg.rating || 0;
    const totalReviewsCount = aggregations._count.id || 0;

    // Update the tutor's profile with the new rating
    await tx.tutorProfile.update({
      where: { id: booking.tutorProfileId },
      data: { rating: newAverageRating, reviewCount: totalReviewsCount },
    });

    return newReview;
  });
};

export const getByTutor = async (tutorProfileId: string) => {
  return await prisma.review.findMany({
    where: { tutorProfileId },
    include: {
      studentProfile: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      // Deeply including booking and availability details
      booking: {
        include: {
          availability: {
            select: {
              title: true,
              subject: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getMyReviews = async (studentUserId: string) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId },
  });
  if (!student) throw new Error("Student profile missing.");

  return await prisma.review.findMany({
    where: { studentProfileId: student.id },
    include: {
      tutorProfile: {
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const reviewService = {
  add,
  getByTutor,
  getMyReviews,
  
  getAllReviews: async (query: any) => {
    const paginationResult = paginationHelper.calculatePagination({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      sortBy: query.sortBy || "createdAt",
      sortOrder: query.sortOrder || "desc",
    });

    const [totalReviews, reviews] = await Promise.all([
      prisma.review.count(),
      prisma.review.findMany({
        include: {
          studentProfile: {
            include: { user: { select: { name: true } } },
          },
          tutorProfile: {
            include: { user: { select: { name: true } } },
          },
        },
        skip: paginationResult.skip,
        take: paginationResult.limit,
        orderBy: {
          [paginationResult.sortBy]: paginationResult.sortOrder,
        },
      }),
    ]);

    return {
      meta: {
        page: paginationResult.page,
        limit: paginationResult.limit,
        totalReviews,
        totalPages: Math.ceil(totalReviews / paginationResult.limit),
      },
      data: reviews,
    };
  },

  toggleFeatureReview: async (id: string) => {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new Error("Review not found");

    return await prisma.review.update({
      where: { id },
      data: { isFeatured: !review.isFeatured },
    });
  },

  addPlaceholderReview: async (data: { tutorProfileId: string; rating: number; comment?: string; placeholderName: string }) => {
    return await prisma.$transaction(async (tx: any) => {
      const newReview = await tx.review.create({
        data: {
          tutorProfileId: data.tutorProfileId,
          rating: data.rating,
          comment: data.comment,
          isPlaceholder: true,
          placeholderName: data.placeholderName,
        },
      });

      const aggregations = await tx.review.aggregate({
        where: { tutorProfileId: data.tutorProfileId },
        _avg: { rating: true },
        _count: { id: true },
      });

      const newAverageRating = aggregations._avg.rating || 0;
      const totalReviewsCount = aggregations._count.id || 0;

      await tx.tutorProfile.update({
        where: { id: data.tutorProfileId },
        data: { rating: newAverageRating, reviewCount: totalReviewsCount },
      });

      return newReview;
    });
  },

  getFeaturedReviews: async () => {
    return await prisma.review.findMany({
      where: { isFeatured: true },
      include: {
        studentProfile: {
          include: { user: { select: { name: true, image: true } } },
        },
        tutorProfile: {
          include: { user: { select: { name: true, image: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
