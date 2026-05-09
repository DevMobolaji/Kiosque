/*
  Warnings:

  - You are about to drop the column `actor_user_id` on the `audit_logs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_user_id_fkey";

-- DropIndex
DROP INDEX "audit_logs_actor_user_id_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "actor_user_id",
ADD COLUMN     "user_id" UUID;

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
