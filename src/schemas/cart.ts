import { z } from '@hono/zod-openapi';

export const cartSchema = z.object({
  id: z.number().int(),
  user_id: z.number().int(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  deleted_at: z.iso.datetime().nullable().optional(),
});

export const cartItemSchema = z.object({
  id: z.number().int(),
  cart_id: z.number().int(),
  product_id: z.number().int().nullable().optional(),
  bundle_id: z.number().int().nullable().optional(),
  quantity: z.number().int().default(1),
});

export type Cart = z.infer<typeof cartSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
