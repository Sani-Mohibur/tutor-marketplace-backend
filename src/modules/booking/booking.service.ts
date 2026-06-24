// import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

const bookSlotService = async (userId: string, availabilityId: string) => {
  // 1. Ensure the availability slot actually exists
  const slot = await prisma.availability.findUnique({
    where: { id: availabilityId },
    include: {
      tutorProfile: {
        select: { isVerified: true },
      },
    },
  });
  if (!slot) throw new Error("The requested tutor slot does not exist.");

  // 2. Fetch the student's internal profile ID
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
  });
  if (!studentProfile)
    throw new Error("Student profile configuration missing.");

  // 3. Prevent duplicate bookings for the same student on this slot
  const existingBooking = await prisma.booking.findFirst({
    where: {
      studentProfileId: studentProfile.id,
      availabilityId,
    },
  });
  if (existingBooking) throw new Error("You have already joined this session.");

  // 4. Determine paymentStatus based on slot's paymentMethod
  const paymentStatus = slot.paymentMethod === "cash" ? "cash" : "unpaid";

  // 5. Register the student and flip the isBooked flag inside a transaction
  return await prisma.$transaction(async (tx: any) => {
    await tx.availability.update({
      where: { id: availabilityId },
      data: { isBooked: true },
    });

    const booking = await tx.booking.create({
      data: {
        studentProfileId: studentProfile.id,
        availabilityId,
        tutorProfileId: slot.tutorProfileId,
        status: "pending",
        paymentStatus,
      },
      include: {
        availability: {
          select: {
            paymentMethod: true,
            title: true,
            pricePerHour: true,
            timeDuration: true,
          },
        },
      },
    });

    return booking;
  });
};

const cancelBookingService = async (userId: string, bookingId: string) => {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
  });
  if (!studentProfile)
    throw new Error("Student profile configuration missing.");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.studentProfileId !== studentProfile.id) {
    throw new Error("Booking record not found or access denied.");
  }
  if (booking.status === "completed") {
    throw new Error(
      "Cannot cancel a session that has already been marked complete.",
    );
  }
  if (booking.paymentStatus === "paid") {
    throw new Error(
      "Cannot cancel a booking that has already been paid. Please contact support for refunds.",
    );
  }

  return await prisma.$transaction(async (tx: any) => {
    // 1. Delete the current student's booking registration first
    await tx.booking.delete({ where: { id: bookingId } });

    // 2. Check if there are ANY remaining bookings left for this slot
    const remainingBookingsCount = await tx.booking.count({
      where: { availabilityId: booking.availabilityId },
    });

    // 3. Only flip isBooked to false if NO other students are left in the session
    if (remainingBookingsCount === 0) {
      await tx.availability.update({
        where: { id: booking.availabilityId },
        data: { isBooked: false },
      });
    }

    return true;
  });
};

const completeBookingService = async (
  userId: string,
  availabilityId: string,
) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId },
  });
  if (!tutorProfile) throw new Error("Tutor profile configuration missing.");

  const slot = await prisma.availability.findUnique({
    where: { id: availabilityId },
  });
  if (!slot || slot.tutorProfileId !== tutorProfile.id) {
    throw new Error("Slot validation failed or unauthorized access.");
  }

  // Prevent completing the group session before its actual calendar time
  if (new Date() < new Date(slot.slot)) {
    throw new Error(
      "Cannot mark a class complete before its scheduled date and time.",
    );
  }

  // Bulk update all student registrations assigned to this specific slot
  await prisma.booking.updateMany({
    where: { availabilityId },
    data: { status: "completed" },
  });

  // Update the parent availability slot global status configuration mapping
  return await prisma.availability.update({
    where: { id: availabilityId },
    data: { status: "completed" },
  });
};

const getStudentBookingsService = async (userId: string) => {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
  });
  if (!studentProfile)
    throw new Error("Student profile configuration missing.");

  return await prisma.booking.findMany({
    where: { studentProfileId: studentProfile.id },
    include: {
      review: true,
      availability: {
        include: {
          tutorProfile: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getTutorBookingsService = async (userId: string) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId },
  });
  if (!tutorProfile) throw new Error("Tutor profile configuration missing.");

  return await prisma.booking.findMany({
    where: { tutorProfileId: tutorProfile.id },
    include: {
      studentProfile: {
        include: { user: { select: { name: true, email: true } } },
      },
      availability: { select: { slot: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getSlotStudentsService = async (
  tutorUserId: string,
  availabilityId: string,
) => {
  // First find the tutor's profile id using their authenticated userId
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorUserId },
  });

  if (!tutorProfile) {
    throw new Error("Tutor profile not found.");
  }

  return await prisma.booking.findMany({
    where: {
      availabilityId,
      tutorProfileId: tutorProfile.id, // Securely ensures the booking belongs to this tutor
    },
    include: {
      studentProfile: {
        select: {
          id: true,
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });
};

const getStudentStatsService = async (userId: string) => {
  // 1. Fetch the student's internal profile ID
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
  });
  if (!studentProfile)
    throw new Error("Student profile configuration missing.");

  // 2. Query only completed bookings along with slot specifications and tutor rates
  const completedBookings = await prisma.booking.findMany({
    where: {
      studentProfileId: studentProfile.id,
      status: "completed",
    },
    include: {
      availability: {
        select: {
          timeDuration: true,
          pricePerHour: true,
        },
      },
    },
  });

  // 3. Compute stats metrics down via reduction
  let totalMinutes = 0;
  let totalCost = 0;

  completedBookings.forEach((b: any) => {
    const duration = b.availability?.timeDuration
      ? parseInt(b.availability.timeDuration, 10)
      : 60;
    const rate = b.availability?.pricePerHour || 0;

    totalMinutes += duration;
    totalCost += rate * (duration / 60);
  });

  return {
    totalHours: Number((totalMinutes / 60).toFixed(1)),
    totalCompleteSessions: completedBookings.length,
    totalCost: Number(totalCost.toFixed(2)),
  };
};

export const bookingService = {
  bookSlotService,
  cancelBookingService,
  completeBookingService,
  getStudentBookingsService,
  getTutorBookingsService,
  getSlotStudentsService,
  getStudentStatsService,
};
