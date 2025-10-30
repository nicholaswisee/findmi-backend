import { z } from '@hono/zod-openapi';
import { userDepartmentEnum } from './user';

export const productSchema = z.object({
  id: z.number().int(),
  name: z.string().openapi({ example: 'Kaos AMI 2026' }),
  description: z.string().openapi({ example: 'Kaos resmi acara AMI 2026.' }),
  price: z.string().openapi({ example: '99000.00' }),
  category: userDepartmentEnum,
  image_url: z.url(),
  remaining_stock: z.number().int(),
});

export type Product = z.infer<typeof productSchema>;
