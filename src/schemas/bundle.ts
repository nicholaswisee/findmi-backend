import { z } from '@hono/zod-openapi';
import { userDepartmentEnum } from './user';

export const bundleItemSchema = z.object({
  product_id: z.number().openapi({ example: 1 }),
  amount: z.number().openapi({ example: 2 }),
});

export const bundleItemsJSONSchema = z.array(bundleItemSchema);

export const bundleSchema = z.object({
  id: z.number().int(),
  name: z.string().openapi({ example: 'Paket AMI Merchandise' }),
  description: z.string(),
  bundle_items: bundleItemsJSONSchema,
  image_url: z.url(),
  price: z.string(),
  category: userDepartmentEnum,
  is_hidden: z.boolean(),
});

export type Bundle = z.infer<typeof bundleSchema>;
