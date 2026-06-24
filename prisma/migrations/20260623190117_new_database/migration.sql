-- AlterTable
ALTER TABLE "availability" ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'cash';

-- AlterTable
ALTER TABLE "booking" ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid';
