import { z } from '@hono/zod-openapi';
import { createSuccessResponse } from './common/response';
import { userSchema, userRoleEnum } from './user';

export const loginBodySchema = z
  .object({
    nim: z.string().min(1).openapi({ example: '13524000' }),
    password: z.string().min(1).openapi({ example: 'strong-password' }),
  })
  .openapi('LoginBody');

const userWithAccountSchema = userSchema.extend({
  email: z.string().email().openapi({ example: 'user@example.com' }),
  provider: z.string().openapi({ example: 'google' }),
});

export const sessionMetadataSchema = z
  .object({
    fingerprint: z
      .string()
      .openapi({ example: 'YmFzZTY0dXJsLWZpbmdlcnByaW50' }),
    issuedAt: z.number().int().openapi({ example: 1700000000 }),
    expiresAt: z.number().int().openapi({ example: 1700086400 }),
  })
  .openapi('SessionMetadata');

export const loginSuccessSchema = createSuccessResponse(
  z.object({
    user: userWithAccountSchema,
    session: sessionMetadataSchema,
  }),
).openapi('LoginSuccess');

export const logoutSuccessSchema = createSuccessResponse(
  z.object({ ok: z.boolean().openapi({ example: true }) }),
).openapi('LogoutSuccess');

export const sessionPayloadSchema = z
  .object({
    userId: z.number().int().openapi({ example: 1 }),
    accountId: z.number().int().openapi({ example: 10 }),
    email: z.string().email().openapi({ example: 'user@example.com' }),
    role: userRoleEnum,
  })
  .openapi('SessionPayload');

export const verifySuccessSchema = createSuccessResponse(
  z.object({
    payload: sessionPayloadSchema,
    session: sessionMetadataSchema,
  }),
).openapi('VerifySuccess');

export const meSuccessSchema = createSuccessResponse(
  z.object({
    user: userWithAccountSchema,
    session: sessionMetadataSchema,
  }),
).openapi('MeSuccess');
