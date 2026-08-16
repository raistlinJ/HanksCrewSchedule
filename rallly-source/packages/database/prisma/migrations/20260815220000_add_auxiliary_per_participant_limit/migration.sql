ALTER TABLE "poll_auxiliary_selections"
  ADD COLUMN "max_yes_selections" INTEGER;

ALTER TABLE "poll_auxiliary_selections"
  ADD CONSTRAINT "poll_auxiliary_selections_max_yes_selections_positive"
  CHECK ("max_yes_selections" IS NULL OR "max_yes_selections" > 0);
