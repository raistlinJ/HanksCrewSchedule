ALTER TABLE "options"
ADD COLUMN "max_yes" INTEGER;

ALTER TABLE "options"
ADD CONSTRAINT "options_max_yes_positive"
CHECK ("max_yes" IS NULL OR "max_yes" > 0);
