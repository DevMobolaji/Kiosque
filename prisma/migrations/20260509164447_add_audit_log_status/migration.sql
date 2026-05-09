-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "status" "AuditStatus" NOT NULL DEFAULT 'PENDING';
