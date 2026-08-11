-- AlterTable
ALTER TABLE "PollGroup" ADD COLUMN "poll_order" TEXT[] DEFAULT ARRAY[]::TEXT[];
