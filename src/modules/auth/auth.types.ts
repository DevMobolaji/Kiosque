import { UserRole } from "@prisma/client";
import { RequestContext } from "interfaces/request.interface";

export interface RegisterResult {
  success: true;
  message: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  context: RequestContext;
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