-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "description" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;
