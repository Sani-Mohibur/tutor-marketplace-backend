import { prisma } from "../../lib/prisma.js";

interface CreateSlotData {
  userId: string;
  slot: string; // ISO Date String from request body
  title?: string;
  subject?: string;
  details?: string;
  location?: string;
  timeDuration?: string;
  pricePerHour?: number;
  paymentMethod?: string; // "cash" | "stripe" | "both"
}

const createAvailabilityService = async ({
  userId,
  slot,
  title,
  subject,
  details,
  location,
  timeDuration,
  pricePerHour,
  paymentMethod,
}: CreateSlotData) => {
  // 1. Find the TutorProfile connected to the logged-in User ID
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId },
  });

  if (!tutorProfile) {
    throw new Error("Tutor profile not found for this account.");
  }

  // 2. Validate: only verified tutors can accept Stripe payments
  if (
    paymentMethod &&
    (paymentMethod === "stripe" || paymentMethod === "both") &&
    !tutorProfile.isVerified
  ) {
    throw new Error(
      "Only verified tutors can accept Stripe payments. Please get verified first.",
    );
  }

  // 3. Insert the open availability slot record with new optional metadata
  const newSlot = await prisma.availability.create({
    data: {
      tutorProfileId: tutorProfile.id,
      slot: new Date(slot),
      isBooked: false,
      title,
      subject,
      details,
      location,
      timeDuration,
      pricePerHour,
      paymentMethod: paymentMethod || "cash",
    },
  });

  return newSlot;
};

const getAllAvailabilitiesService = async (tutorProfileId?: string) => {
  return await prisma.availability.findMany({
    where: {
      isBooked: false,
      ...(tutorProfileId ? { tutorProfileId } : {}),
    },
    include: {
      tutorProfile: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
    orderBy: { slot: "asc" },
  });
};

const getAllUpcomingAvailabilitiesService = async (tutorProfileId?: string) => {
  return await prisma.availability.findMany({
    where: {
      slot: {
        gt: new Date(), // Filters for slots strictly in the future
      },
      ...(tutorProfileId ? { tutorProfileId } : {}),
    },
    include: {
      tutorProfile: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
    orderBy: { slot: "asc" },
  });
};

// Student shows available slot he didn't book
const getUpcomingAvailabilitiesService = async (
  userId: string,
  tutorProfileId?: string,
) => {
  // 1. Fetch the student's internal profile ID
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!studentProfile) throw new Error("Student profile missing.");

  // 2. Fetch future slots excluding ones the student already booked
  return await prisma.availability.findMany({
    where: {
      slot: { gt: new Date() }, // Future slots only
      ...(tutorProfileId ? { tutorProfileId } : {}),
      // The magic filter: hides the slot if this student's ID is in the booking list
      bookings: {
        none: {
          studentProfileId: studentProfile.id,
        },
      },
    },
    include: {
      tutorProfile: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: { slot: "asc" },
  });
};

const getTutorAvailabilitiesService = async (userId: string) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId },
  });

  if (!tutorProfile) throw new Error("Tutor profile not found.");

  return await prisma.availability.findMany({
    where: { tutorProfileId: tutorProfile.id },
    orderBy: { slot: "asc" },
  });
};

const updateAvailabilityService = async (
  id: string,
  userId: string,
  payload: { slot?: string; details?: string; location?: string },
) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId },
  });
  if (!tutorProfile) throw new Error("Tutor profile not found.");

  const availability = await prisma.availability.findUnique({ where: { id } });
  if (!availability || availability.tutorProfileId !== tutorProfile.id) {
    throw new Error("Slot not found or unauthorized access.");
  }
  if (availability.isBooked)
    throw new Error("Cannot update an already booked slot.");

  // Build the dynamic update data object safely
  const updateData: any = {};
  if (payload.slot) updateData.slot = new Date(payload.slot);
  if (payload.details !== undefined) updateData.details = payload.details;
  if (payload.location !== undefined) updateData.location = payload.location;

  return await prisma.availability.update({
    where: { id },
    data: updateData,
  });
};

const deleteAvailabilityService = async (id: string, userId: string) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId },
  });
  if (!tutorProfile) throw new Error("Tutor profile not found.");

  const availability = await prisma.availability.findUnique({ where: { id } });
  if (!availability || availability.tutorProfileId !== tutorProfile.id) {
    throw new Error("Slot not found or unauthorized access.");
  }
  if (availability.isBooked)
    throw new Error("Cannot delete an already booked slot.");

  return await prisma.availability.delete({ where: { id } });
};

export const availabilityService = {
  createAvailabilityService,
  getAllAvailabilitiesService,
  getTutorAvailabilitiesService,
  updateAvailabilityService,
  deleteAvailabilityService,
  getAllUpcomingAvailabilitiesService,
  getUpcomingAvailabilitiesService,
};
