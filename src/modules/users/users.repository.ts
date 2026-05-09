import { prisma } from '@/config/database';
import { Prisma, User } from '@prisma/client';


/**
 * Repository = thin layer over Prisma.
 * All database access for users goes through here.
 * No business logic, no validation — that lives in the service.
 */
export class UsersRepository {
  async create(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient): Promise<User> {
    return (tx ?? prisma).user.create({ data });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return (tx ?? prisma).user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return (tx ?? prisma).user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async findByEmailIncludingDeleted(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return (tx ?? prisma).user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput, tx?: Prisma.TransactionClient): Promise<User> {
    return (tx ?? prisma).user.update({
      where: { id },
      data,
    });
  }

  async markEmailVerified(id: string, tx?: Prisma.TransactionClient): Promise<User> {
    return (tx ?? prisma).user.update({
      where: { id },
      data: { emailVerified: true },
    });
  }

  async updatePassword(id: string, passwordHash: string, tx?: Prisma.TransactionClient): Promise<User> {
    return (tx ?? prisma).user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  /**
   * Soft delete + PII anonymization (NDPR compliance).
   * Email gets randomized to free it up for re-registration if user later returns.
   * Personal info gets nulled. Order history stays intact for tax records.
   */
  async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<User> {
    const anonymizedEmail = `deleted_${id}@kiosque.deleted`;
    return (tx ?? prisma).user.update({
      where: { id },
      data: {
        email: anonymizedEmail,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        avatarUrl: null,
        passwordHash: 'deleted',
        deletedAt: new Date(),
      },
    });
  }

  async exists(email: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const count = await (tx ?? prisma).user.count({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    return count > 0;
  }
}

export const usersRepository = new UsersRepository();
