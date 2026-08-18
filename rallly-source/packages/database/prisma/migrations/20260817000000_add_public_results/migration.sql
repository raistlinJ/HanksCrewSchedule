-- AlterTable
ALTER TABLE "polls" ADD COLUMN "public_results" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "poll_groups" ADD COLUMN "public_results" BOOLEAN NOT NULL DEFAULT false;
