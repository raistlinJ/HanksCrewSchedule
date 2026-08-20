ALTER TABLE "polls"
ADD COLUMN "is_on_demand" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "polls_space_id_is_on_demand_idx"
ON "polls"("space_id", "is_on_demand");
