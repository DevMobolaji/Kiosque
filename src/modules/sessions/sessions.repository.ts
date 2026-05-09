import { Prisma, Session } from '@prisma/client';
import { prisma } from '@/config/database';

class SessionsRepository {
  async create(data: Prisma.SessionUncheckedCreateInput): Promise<Session> {
    return prisma.session.create({ data });
  }

  async findById(id: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { id } });
  }

  async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: { refreshTokenHash: hash, revokedAt: null },
    });
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Rotate refresh token: update the hash and bump expiry.
   * Returns updated session.
   */
  async rotate(id: string, newHash: string, newExpiresAt: Date): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data: {
        refreshTokenHash: newHash,
        expiresAt: newExpiresAt,
      },
    });
  }

  async revoke(id: string): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async deleteExpired(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}

export const sessionsRepository = new SessionsRepository();
