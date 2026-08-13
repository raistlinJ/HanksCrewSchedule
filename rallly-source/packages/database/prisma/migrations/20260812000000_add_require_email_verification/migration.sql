-- AlterTable
ALTER TABLE "polls" ADD COLUMN "require_email_verification" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "poll_groups" ADD COLUMN "require_email_verification" BOOLEAN NOT NULL DEFAULT true;
