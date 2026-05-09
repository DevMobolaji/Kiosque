import { prisma } from "@/config/database";
import { AuditLog, Prisma } from "@prisma/client";

export class AuditLogRepository {
  // Placeholder for audit log repository methods
  async create(data: Prisma.AuditLogCreateInput, tx?: Prisma.TransactionClient): Promise<AuditLog> {

    return (tx ?? prisma).auditLog.create({ data });
  }

}

export const auditLogRepository = new AuditLogRepository();
