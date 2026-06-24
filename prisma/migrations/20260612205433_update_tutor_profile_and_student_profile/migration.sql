-- AlterTable
ALTER TABLE "student_profile" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "education" TEXT,
ADD COLUMN     "interests" TEXT[],
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "tutor_profile" ADD COLUMN     "experience" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qualifications" TEXT,
ADD COLUMN     "skills" TEXT[],
ADD COLUMN     "title" TEXT,
ADD COLUMN     "totalHoursTaught" INTEGER NOT NULL DEFAULT 0;
