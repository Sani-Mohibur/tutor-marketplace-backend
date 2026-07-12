-- AlterTable
ALTER TABLE "review" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "placeholderName" TEXT,
ALTER COLUMN "studentProfileId" DROP NOT NULL,
ALTER COLUMN "bookingId" DROP NOT NULL;
