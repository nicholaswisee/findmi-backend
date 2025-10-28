import type { InferSelectModel } from 'drizzle-orm';
import { usersTable, accountsTable } from '../db/schema';

export type User = InferSelectModel<typeof usersTable>;
export type Account = InferSelectModel<typeof accountsTable>;

// Login with NIM and Password
export type LoginUserInput = {
  nim: string;
  password: string;
};

// For Google OAuth login (initiated via redirect, handled in callback)
export type GoogleAuthCallbackInput = {
  code: string; // Authorization code from Google
  state?: string; // Optional state parameter
};

// Google user profile data from OAuth
export type GoogleUserProfile = {
  id: string; // Google user ID
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  verified_email: boolean;
};

export type LoginResponse = {
  user: SafeUser;
  token: string;
};

// JWT payload (what gets encoded in the token)
export type JWTPayload = {
  userId: number;
  accountId: number;
  email: string;
  role: User['role'];
  iat?: number; // issued at
  exp?: number; // expiration
};

// User without sensitive data (for API responses)
export type SafeUser = Omit<User, 'deleted_at'> & {
  email: string; // Include email from account
};
