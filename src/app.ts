import express from "express";
import cors from "cors";
import morgan from "morgan";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import availabilityRouter from "./modules/availability/availability.route.js";
import bookingRouter from "./modules/booking/booking.route.js";
import reviewRouter from "./modules/review/review.route.js";
import profileRouter from "./modules/profile/profile.route.js";
import tutorRouter from "./modules/tutor/tutor.route.js";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.js";
import adminRouter from "./modules/admin/admin.route.js";
import paymentRouter from "./modules/payment/payment.route.js";
import { paymentController } from "./modules/payment/payment.controller.js";
import contactRouter from "./modules/contact/contact.route.js";

const app = express();

app.use(morgan("dev"));

// 1. Global Middleware Rules
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);

// 2. Stripe Webhook — MUST come before express.json() to receive raw body
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Better Auth Internal Dynamic Routes
app.all("/api/auth/*path", toNodeHandler(auth));

// 4. Base Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// 5. Custom Application API Routes
app.use("/api/availability", availabilityRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/profile", profileRouter);
app.use("/api/tutor", tutorRouter);
app.use("/api/admin", adminRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/contact", contactRouter);

// 6. Global Error Handler (Must be registered last)
app.use(globalErrorHandler);

export default app;
