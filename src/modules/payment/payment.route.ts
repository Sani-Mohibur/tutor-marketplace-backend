import { Router } from "express";
import { paymentController } from "./payment.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { USER_ROLES } from "../../constants/user.constants.js";

const paymentRouter = Router();

// Student only: Create a Stripe Checkout session for a booking (for "both" slots)
paymentRouter.post(
  "/create-checkout-session",
  requireAuth([USER_ROLES.STUDENT]),
  paymentController.createCheckoutSession,
);

// Student only: Direct checkout for stripe-only slots (pay first, book after)
paymentRouter.post(
  "/create-direct-checkout",
  requireAuth([USER_ROLES.STUDENT]),
  paymentController.createDirectCheckout,
);

// Student only: Get payment receipt details by Stripe session ID
paymentRouter.get(
  "/receipt/:sessionId",
  requireAuth([USER_ROLES.STUDENT]),
  paymentController.getPaymentDetails,
);

// Note: The webhook route is registered separately in app.ts
// because it needs express.raw() instead of express.json()

export default paymentRouter;
