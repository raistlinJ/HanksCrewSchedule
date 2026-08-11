-- CreateTable
CREATE TABLE "poll_groups" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "space_id" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "poll_order" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "poll_groups_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "polls" ADD COLUMN "poll_group_id" TEXT;

-- AlterTable
ALTER TABLE "spaces" ADD COLUMN "poll_group_order" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "spaces" ADD COLUMN "poll_order" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "poll_groups_space_id_idx" ON "poll_groups"("space_id");

-- CreateIndex
CREATE INDEX "poll_groups_user_id_idx" ON "poll_groups"("user_id");

-- CreateIndex
CREATE INDEX "polls_poll_group_id_idx" ON "polls"("poll_group_id");

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_poll_group_id_fkey" FOREIGN KEY ("poll_group_id") REFERENCES "poll_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_groups" ADD CONSTRAINT "poll_groups_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_groups" ADD CONSTRAINT "poll_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
