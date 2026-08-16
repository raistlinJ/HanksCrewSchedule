CREATE TABLE "poll_auxiliary_selections" (
  "id" TEXT NOT NULL,
  "poll_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "min_yes" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "poll_auxiliary_selections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "poll_auxiliary_selections_min_yes_nonnegative"
    CHECK ("min_yes" >= 0)
);

CREATE TABLE "poll_auxiliary_options" (
  "id" TEXT NOT NULL,
  "auxiliary_selection_id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "max_yes" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "poll_auxiliary_options_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "poll_auxiliary_options_position_nonnegative"
    CHECK ("position" >= 0),
  CONSTRAINT "poll_auxiliary_options_max_yes_positive"
    CHECK ("max_yes" IS NULL OR "max_yes" > 0)
);

CREATE TABLE "poll_auxiliary_votes" (
  "id" TEXT NOT NULL,
  "participant_id" TEXT NOT NULL,
  "auxiliary_option_id" TEXT NOT NULL,
  "poll_id" TEXT NOT NULL,
  "type" "vote_type" NOT NULL DEFAULT 'ifNeedBe',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3),

  CONSTRAINT "poll_auxiliary_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "poll_auxiliary_selections_poll_id_key"
  ON "poll_auxiliary_selections"("poll_id");
CREATE INDEX "poll_auxiliary_options_auxiliary_selection_id_idx"
  ON "poll_auxiliary_options"("auxiliary_selection_id");
CREATE INDEX "poll_auxiliary_votes_poll_id_idx"
  ON "poll_auxiliary_votes" USING HASH ("poll_id");
CREATE INDEX "poll_auxiliary_votes_participant_id_idx"
  ON "poll_auxiliary_votes" USING HASH ("participant_id");
CREATE INDEX "poll_auxiliary_votes_auxiliary_option_id_idx"
  ON "poll_auxiliary_votes" USING HASH ("auxiliary_option_id");
CREATE UNIQUE INDEX "poll_auxiliary_votes_participant_id_auxiliary_option_id_key"
  ON "poll_auxiliary_votes"("participant_id", "auxiliary_option_id");

ALTER TABLE "poll_auxiliary_selections"
  ADD CONSTRAINT "poll_auxiliary_selections_poll_id_fkey"
  FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "poll_auxiliary_options"
  ADD CONSTRAINT "poll_auxiliary_options_auxiliary_selection_id_fkey"
  FOREIGN KEY ("auxiliary_selection_id") REFERENCES "poll_auxiliary_selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "poll_auxiliary_votes"
  ADD CONSTRAINT "poll_auxiliary_votes_participant_id_fkey"
  FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "poll_auxiliary_votes"
  ADD CONSTRAINT "poll_auxiliary_votes_auxiliary_option_id_fkey"
  FOREIGN KEY ("auxiliary_option_id") REFERENCES "poll_auxiliary_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "poll_auxiliary_votes"
  ADD CONSTRAINT "poll_auxiliary_votes_poll_id_fkey"
  FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
