import { prisma } from "@/config/database";
import { OutboxEvent, Prisma } from "@prisma/client";

export class OutboxRepository {
  // Placeholder for outbox repository methods
  async create(data: Prisma.OutboxEventCreateInput, tx?: Prisma.TransactionClient): Promise<OutboxEvent> {

    return (tx ?? prisma).outboxEvent.create({ data });
  }

}

export const outboxRepository = new OutboxRepository();

