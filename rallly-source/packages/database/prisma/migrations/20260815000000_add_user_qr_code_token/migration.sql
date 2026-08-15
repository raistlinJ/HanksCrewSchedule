-- Every registered account receives an opaque QR credential. PostgreSQL
-- generates values for existing rows as well as future inserts that do not go
-- through Prisma (Prisma also declares uuid() as the application default).
ALTER TABLE "users"
ADD COLUMN "qr_code_token" UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "users_qr_code_token_key" ON "users"("qr_code_token");
