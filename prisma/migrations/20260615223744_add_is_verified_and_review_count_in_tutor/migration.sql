/*
  Warnings:

  - You are about to drop the column `categoryId` on the `tutor_profile` table. All the data in the column will be lost.
  - You are about to drop the column `experience` on the `tutor_profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tutor_profile" DROP COLUMN "categoryId",
DROP COLUMN "experience",
ADD COLUMN     "experienceYears" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0;
