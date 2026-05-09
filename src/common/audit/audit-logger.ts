import { AuditStatus, Prisma } from '@prisma/client';
import { RequestContext } from 'interfaces/request.interface';
import { AuditLogRepository, auditLogRepository } from '@/modules/audit-log/audit-log.repository';
import { AuditAction } from './audit-actions';

interface LogOptions {
  userId?: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
}

interface UserActionOptions {
  userId?: string;
  targetUserId: string;
  action: AuditAction;
  status: AuditStatus;
  metadata?: Record<string, any>;
}

class AuditLogger {
  constructor(private auditLogs: AuditLogRepository) { }

  /**
   * Base method — writes any audit log entry.
   * All other methods delegate here.
   */
  async log(
    context: RequestContext,
    action: AuditAction,
    status: AuditStatus,
    options: LogOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.auditLogs.create(
      {
        user: options.userId ? { connect: { id: options.userId } } : undefined,
        action,
        status,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        metadata: options.metadata,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      tx,
    );
  }

  /**
   * Convenience for actions on a user resource.
   * Pre-fills resourceType='user'.
   */
  async userAction(
    context: RequestContext,
    options: UserActionOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    return this.log(
      context,
      options.action,
      options.status,
      {
        userId: options.userId,
        resourceType: 'user',
        resourceId: options.targetUserId,
        metadata: options.metadata,
      },
      tx,
    );
  }
}

export const auditLogger = new AuditLogger(auditLogRepository);