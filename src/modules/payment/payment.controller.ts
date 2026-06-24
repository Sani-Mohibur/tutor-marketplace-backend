import { Request, Response } from "express";
import { paymentService } from "./payment.service.js";
import { stripe } from "../../lib/stripe.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import ApiError from "../../errors/ApiError.js";

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; email: string; name: string };
}

const createCheckoutSession = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { bookingId } = req.body;

    if (!bookingId) {
      throw new ApiError(400, "Booking ID is required.");
    }

    const data = await paymentService.createCheckoutSessionService(
      req.user!.id,
      bookingId,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Checkout session created successfully.",
      data,
    });
  },
);

const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // This is the raw body buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed:`, err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      await paymentService.handleSuccessfulPayment(session.id);
      break;
    }
    case "payment_intent.succeeded": {
      console.log(`💰 PaymentIntent succeeded: ${event.data.object.id}`);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};

const getPaymentDetails = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new ApiError(400, "Session ID is required.");
    }

    const data = await paymentService.getPaymentDetailsService(
      sessionId as string,
    );

    if (!data) {
      throw new ApiError(404, "Payment details not found.");
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Payment details retrieved.",
      data,
    });
  },
);

const createDirectCheckout = catchAsync(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { availabilityId } = req.body;

    if (!availabilityId) {
      throw new ApiError(400, "Availability ID is required.");
    }

    const data = await paymentService.createDirectCheckoutService(
      req.user!.id,
      availabilityId,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Direct checkout session created.",
      data,
    });
  },
);

export const paymentController = {
  createCheckoutSession,
  createDirectCheckout,
  handleWebhook,
  getPaymentDetails,
};
