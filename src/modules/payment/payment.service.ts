import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../lib/stripe.js";
import ApiError from "../../errors/ApiError.js";
import puppeteer from "puppeteer";

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
    success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/payment-cancel?booking_id=${booking.id}`,
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

const generateReceiptPDFService = async (stripeSessionId: string) => {
  const receipt = await getPaymentDetailsService(stripeSessionId);
  if (!receipt) throw new ApiError(404, "Receipt not found");

  const dateStr = receipt.sessionDate
    ? new Date(receipt.sessionDate).toLocaleDateString(undefined, {
        dateStyle: "medium",
      })
    : "N/A";

  const amountStr = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: receipt.currency || "usd",
  }).format(receipt.amount || 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #334155; -webkit-font-smoothing: antialiased; padding: 40px; }
        .receipt-container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 48px; max-width: 700px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9; }
        .brand h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.5px; }
        .brand p { font-size: 13px; color: #64748b; }
        .title { text-align: right; }
        .title h2 { font-size: 16px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
        
        .status-badge { display: inline-block; background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px; background: #f8fafc; padding: 24px; border-radius: 8px; }
        .detail-item p { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .detail-item h4 { font-size: 15px; font-weight: 600; color: #0f172a; }
        
        .summary-box { border-top: 2px solid #f1f5f9; padding-top: 24px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; }
        .summary-box .label { font-size: 16px; font-weight: 600; color: #475569; }
        .summary-box .amount { font-size: 32px; font-weight: 800; color: #10b981; letter-spacing: -1px; }
        
        .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 24px; }
        .txn-id { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; display: inline-block; margin-top: 12px; color: #64748b; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <div class="brand">
            <h1>SkillBridge</h1>
            <p>Tutoring Excellence Platform</p>
          </div>
          <div class="title">
            <h2>Payment Receipt</h2>
            <div class="status-badge">${receipt.paymentStatus?.toUpperCase()}</div>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <p>Session Topic</p>
            <h4>${receipt.sessionTitle || receipt.sessionSubject || "General Session"}</h4>
          </div>
          <div class="detail-item">
            <p>Date & Time</p>
            <h4>${dateStr}</h4>
          </div>
          <div class="detail-item">
            <p>Tutor</p>
            <h4>${receipt.tutorName || "Assigned Tutor"}</h4>
          </div>
          <div class="detail-item">
            <p>Booking ID</p>
            <h4 style="font-family: monospace; font-size: 13px;">#${receipt.bookingId.slice(-8).toUpperCase()}</h4>
          </div>
        </div>

        <div class="summary-box">
          <div class="label">Total Amount Paid</div>
          <div class="amount">${amountStr}</div>
        </div>

        <div class="footer">
          <p>Thank you for choosing SkillBridge. If you have any questions, please contact support.</p>
          ${receipt.stripeSessionId ? `<div class="txn-id">Transaction Ref: ${receipt.stripeSessionId}</div>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" }, // Margins handled by CSS padding
  });

  await browser.close();

  return { pdfBuffer, bookingId: receipt.bookingId };
};

export const paymentService = {
  createCheckoutSessionService,
  createDirectCheckoutService,
  handleSuccessfulPayment,
  getPaymentDetailsService,
  generateReceiptPDFService,
};
