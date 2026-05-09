import { UserRole } from "@prisma/client";

export interface RegisterResult {
  success: true;
  message: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
}