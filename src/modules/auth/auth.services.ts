import { UsersRepository, usersRepository } from '@/modules/users/users.repository';
import { AuditLogRepository, auditLogRepository } from '@/modules/audit-log/audit-log.repository';
import { OutboxRepository, outboxRepository } from '@/infrastructure/outbox/outbox.repository';
import { RegisterInput, RegisterResult } from './auth.types';
import { randomUUID } from 'crypto';

class AuthService {

  constructor(
    private outbox: OutboxRepository,
    private users: UsersRepository,
    private auditLogs: AuditLogRepository
  ) { }

  private async handleDuplicateRegistration(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RegisterResult> {
    const existing = await this.users.findByEmail(email);

    await this.auditLogs.create({
      actor: existing ? { connect: { id: existing.id } } : undefined,
      action: 'user.register.duplicate_attempt',
      resourceType: 'user',
      resourceId: existing?.id ?? randomUUID(),
      metadata: { email, reason: 'email_already_registered' },
      ipAddress,
      userAgent,
    });

    // 3. Return a fake success that looks identical to a real registration.
    //    The user object is fabricated — id and createdAt don't correspond to anything real.
    return {
      success: true,
      message: 'Registration successful. Check your email to verify.',
    };
  }

  public async register(input: RegisterInput): Promise<RegisterResult> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.users.findByEmail(email);

    if (existing) {
      return this.handleDuplicateRegistration(email, input.ipAddress, input.userAgent);
    }

    throw new Error("Registration logic not implemented yet");
  }
}

export const authService = new AuthService(
  outboxRepository,
  usersRepository,
  auditLogRepository,
)