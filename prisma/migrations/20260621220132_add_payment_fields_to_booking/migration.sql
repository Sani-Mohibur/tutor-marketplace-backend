ALTER TABLE "booking" ADD COLUMN "amount" DOUBLE PRECISION;
ALTER TABLE "booking" ADD COLUMN "currency" TEXT;
ALTER TABLE "booking" ADD COLUMN "stripeCheckoutSessionId" TEXT;
CREATE UNIQUE INDEX "booking_stripeCheckoutSessionId_key" ON "booking"("stripeCheckoutSessionId");