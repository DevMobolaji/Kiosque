/*
  Warnings:

  - You are about to drop the column `email_verified` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "email_verified",
ADD COLUMN     "email_verification_expires_at" TIMESTAMPTZ,
ADD COLUMN     "email_verification_token_hash" VARCHAR(64),
ADD COLUMN     "email_verified_at" TIMESTAMPTZ,
ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_login_at" TIMESTAMPTZ,
ADD COLUMN     "locked_until" TIMESTAMPTZ,
ADD COLUMN     "password_changed_at" TIMESTAMPTZ,
ADD COLUMN     "password_reset_expires_at" TIMESTAMPTZ,
ADD COLUMN     "password_reset_token_hash" VARCHAR(64);
