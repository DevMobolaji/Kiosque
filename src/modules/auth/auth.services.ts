import { UsersRepository, usersRepository } from '@/modules/users/users.repository';
import { OutboxRepository, outboxRepository } from '@/infrastructure/outbox/outbox.repository';
import { RegisterInput, RegisterResult } from './auth.types';
import { RequestContext } from 'interfaces/request.interface';
import { AuditAction } from '@/common/audit/audit-actions';
import { AuditStatus } from '@prisma/client';
import { auditLogger } from '@/common/audit/audit-logger';
import { hashPassword } from '@/common/utils/argon';
import { generateSecureToken, hashToken } from '@/common/utils/tokens';
import { prisma } from '@/config/database';

class AuthService {

  constructor(
    private outbox: OutboxRepository,
    private users: UsersRepository,
  ) { }

  private async handleDuplicateRegistration(
    email: string,
    context: RequestContext,
  ): Promise<RegisterResult> {
    const existing = await this.users.findByEmail(email);

    await auditLogger.userAction(context, {
      userId: existing?.id,
      targetUserId: existing?.id ?? '00000000-0000-0000-0000-000000000000',
      action: AuditAction.USER_REGISTER_DUPLICATE,
      status: AuditStatus.FAILED,
      metadata: { email, reason: 'email_already_registered' },
    });

    return {
      success: true,
      message: 'Registration successful. Check your email to verify.',
    };
  }
  public async register(input: RegisterInput): Promise<RegisterResult> {
    const email = input.email.toLowerCase().trim();

    const existing = await this.users.findByEmail(email);
    if (existing) {
      return this.handleDuplicateRegistration(email, input.context);
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Generate verification token (raw goes in email, hash goes in DB)
    const verificationToken = generateSecureToken();
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Atomically: create user, log audit, queue email
    await prisma.$transaction(async (tx) => {
      const user = await this.users.create(
        {
          email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          emailVerificationTokenHash: verificationTokenHash,
          emailVerificationExpiresAt: verificationExpiresAt,
        },
        tx,
      );

      await auditLogger.userAction(input.context, {
        userId: user.id,
        targetUserId: user.id,
        action: AuditAction.USER_REGISTER,
        status: AuditStatus.SUCCESS,
        metadata: { email: user.email },
      }, tx);

      await this.outbox.create(
        {
          aggregateType: 'user',
          aggregateId: user.id,
          eventType: 'user.registered',
          payload: {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            verificationToken, // raw token, not hash — worker uses this in the email link
          },
        },
        tx,
      );
    });

    return {
      success: true,
      message: 'Registration successful. Check your email to verify.',
    };
  }
}

export const authService = new AuthService(
  outboxRepository,
  usersRepository,
)