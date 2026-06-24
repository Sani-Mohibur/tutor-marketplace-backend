import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../lib/stripe.js";
import ApiError from "../../errors/ApiError.js";

// For "both" payment slots (booking already exists, student pays after)
const createCheckoutSessionService = async (
  userId: string,
  bookingId: string,
) => {
  // 1. Fetch the student profile
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
  });
  if (!studentProfile) {
    throw new ApiError(404, "Student profile not found.");
  }

  // 2. Fetch the booking with related availability and tutor data
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      availability: {
        include: {
          tutorProfile: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found.");
  }

  // 3. Verify the booking belongs to this student
  if (booking.studentProfileId !== studentProfile.id) {
    throw new ApiError(403, "You are not authorized to pay for this booking.");
  }

  // 4. Check if already paid
  if (booking.paymentStatus === "paid") {
    throw new ApiError(400, "This booking has already been paid.");
  }

  // 5. Verify the tutor is verified
  const tutorProfile = booking.availability.tutorProfile;
  if (!tutorProfile.isVerified) {
    throw new ApiError(400, "The tutor is not verified for Stripe payments.");
  }

  // 6. Verify the slot accepts Stripe payments
  const paymentMethod = booking.availability.paymentMethod;
  if (paymentMethod !== "stripe" && paymentMethod !== "both") {
    throw new ApiError(400, "This slot does not accept Stripe payments.");
  }

  // 7. Calculate the amount
  const pricePerHour = booking.availability.pricePerHour || 0;
  const durationMinutes = booking.availability.timeDuration
    ? parseInt(booking.availability.timeDuration, 10)
    : 60;
  const totalAmount = pricePerHour * (durationMinutes / 60);

  if (totalAmount <= 0) {
    throw new ApiError(400, "Cannot process payment for a free session.");
  }

  // 8. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: booking.availability.title || "Tutoring Session",
            description: `Session with ${tutorProfile.user.name} — ${booking.availability.subject || "General Tutoring"} (${durationMinutes} mins)`,
          },
          unit_amount: Math.round(totalAmount * 100), // Stripe uses cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookingId: booking.id,
      studentProfileId: studentProfile.id,
      tutorProfileId: tutorProfile.id,
    },
    success_url: `${process.env.CLIENT_URL}/bookings/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/bookings/payment-cancel?booking_id=${booking.id}`,
  });

  return { url: session.url, sessionId: session.id };
};

// For "stripe-only" slots: pay first, booking created by webhook after payment
const createDirectCheckoutService = async (
  userId: string,
  availabilityId: string,
) => {
  // 1. Fetch student profile
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
  });
  if (!studentProfile) {
    throw new ApiError(404, "Student profile not found.");
  }

  // 2. Fetch the availability slot with tutor info
  const slot = await prisma.availability.findUnique({
    where: { id: availabilityId },
    include: {
      tutorProfile: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!slot) {
    throw new ApiError(404, "Slot not found.");
  }

  // 3. Verify slot is stripe-only
  if (slot.paymentMethod !== "stripe") {
    throw new ApiError(400, "This endpoint is only for stripe-only slots.");
  }

  // 4. Verify tutor is verified
  if (!slot.tutorProfile.isVerified) {
    throw new ApiError(400, "The tutor is not verified for Stripe payments.");
  }

  // 5. Check if student already has a booking for this slot
  const existingBooking = await prisma.booking.findFirst({
    where: {
      studentProfileId: studentProfile.id,
      availabilityId,
    },
  });
  if (existingBooking) {
    throw new ApiError(400, "You have already booked this session.");
  }

  // 6. Calculate the amount
  const pricePerHour = slot.pricePerHour || 0;
  const durationMinutes = slot.timeDuration
    ? parseInt(slot.timeDuration, 10)
    : 60;
  const totalAmount = pricePerHour * (durationMinutes / 60);

  if (totalAmount <= 0) {
    throw new ApiError(400, "Cannot process payment for a free session.");
  }

  // 7. Create Stripe Checkout Session (NO booking created yet)
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: slot.title || "Tutoring Session",
            description: `Session with ${slot.tutorProfile.user.name} — ${slot.subject || "General Tutoring"} (${durationMinutes} mins)`,
          },
          unit_amount: Math.round(totalAmount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      // No bookingId — webhook will create the booking
      availabilityId: slot.id,
      studentProfileId: studentProfile.id,
      tutorProfileId: slot.tutorProfileId,
      flow: "stripe-only", // Flag so webhook knows to create booking
    },
    success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
  });

  return { url: session.url, sessionId: session.id };
};

const handleSuccessfulPayment = async (stripeSessionId: string) => {
  // Retrieve the full checkout session from Stripe
  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);

  const flow = session.metadata?.flow;

  if (flow === "stripe-only") {
    // --- STRIPE-ONLY FLOW: Create booking on payment success ---
    const availabilityId = session.metadata?.availabilityId;
    const studentProfileId = session.metadata?.studentProfileId;
    const tutorProfileId = session.metadata?.tutorProfileId;

    if (!availabilityId || !studentProfileId || !tutorProfileId) {
      console.error("Missing metadata in stripe-only session.");
      return;
    }

    // Idempotency: check if booking already created for this session
    const existingBooking = await prisma.booking.findFirst({
      where: { stripeCheckoutSessionId: stripeSessionId },
    });
    if (existingBooking) {
      console.log(
        `Booking already exists for session ${stripeSessionId}. Skipping.`,
      );
      return;
    }

    // Create booking + mark slot as booked in a transaction
    await prisma.$transaction(async (tx: any) => {
      await tx.availability.update({
        where: { id: availabilityId },
        data: { isBooked: true },
      });

      await tx.booking.create({
        data: {
          studentProfileId,
          availabilityId,
          tutorProfileId,
          status: "pending",
          paymentStatus: "paid",
          amount: (session.amount_total || 0) / 100,
          currency: session.currency || "usd",
          stripeCheckoutSessionId: stripeSessionId,
        },
      });
    });

    console.log(
      `✅ Stripe-only: Booking created and paid for slot ${availabilityId}`,
    );
  } else {
    // --- NORMAL FLOW: Booking already exists, just update payment status ---
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) {
      console.error("No bookingId found in Stripe session metadata.");
      return;
    }

    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!existingBooking) {
      console.error(`Booking ${bookingId} not found for payment processing.`);
      return;
    }

    if (existingBooking.paymentStatus === "paid") {
      console.log(`Booking ${bookingId} already marked as paid. Skipping.`);
      return;
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "paid",
        amount: (session.amount_total || 0) / 100,
        currency: session.currency || "usd",
        stripeCheckoutSessionId: stripeSessionId,
      },
    });

    console.log(`✅ Payment confirmed for booking ${bookingId}`);
  }
};

const getPaymentDetailsService = async (stripeSessionId: string) => {
  const booking = await prisma.booking.findFirst({
    where: { stripeCheckoutSessionId: stripeSessionId },
    include: {
      availability: {
        select: {
          title: true,
          subject: true,
          slot: true,
          timeDuration: true,
          pricePerHour: true,
          location: true,
        },
      },
      tutorProfile: {
        select: {
          user: { select: { name: true } },
        },
      },
    },
  });

  if (!booking) return null;

  return {
    bookingId: booking.id,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    amount: booking.amount,
    currency: booking.currency,
    stripeSessionId: booking.stripeCheckoutSessionId,
    sessionTitle: booking.availability.title,
    sessionSubject: booking.availability.subject,
    sessionDate: booking.availability.slot,
    sessionDuration: booking.availability.timeDuration,
    sessionLocation: booking.availability.location,
    tutorName: booking.tutorProfile?.user?.name,
    paidAt: booking.createdAt,
  };
};

export const paymentService = {
  createCheckoutSessionService,
  createDirectCheckoutService,
  handleSuccessfulPayment,
  getPaymentDetailsService,
};
