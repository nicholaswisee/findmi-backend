import type { InferSelectModel } from 'drizzle-orm';
import { usersTable } from '../db/schema';

export type User = InferSelectModel<typeof usersTable>;

// JWT payload (what gets encoded in the token)
export type JWTPayload = {
  userId: number;
  accountId: number;
  email: string;
  role: User['role'];
  iat?: number; // issued at
  exp?: number; // expiration
};
