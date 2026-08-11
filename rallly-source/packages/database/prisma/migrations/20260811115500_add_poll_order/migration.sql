-- AlterTable
ALTER TABLE "poll_groups" ADD COLUMN "poll_order" TEXT[] DEFAULT ARRAY[]::TEXT[];
