import { z } from '@hono/zod-openapi';

export const accountSchema = z.object({
  id: z.number().int(),
  provider: z.string().openapi({ example: 'google' }),
  provider_id: z.string().openapi({ example: 'google-oauth2|12345' }),
  email: z.string().email(),
  user_id: z.number().int(),
  password: z.string().nullable().optional(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  deleted_at: z.iso.datetime().nullable().optional(),
});

export type Account = z.infer<typeof accountSchema>;
