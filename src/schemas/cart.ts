import { z } from '@hono/zod-openapi';
import { createSuccessResponse } from './common/response';
import { productSchema } from './product';
import { bundleSchema } from './bundle';

const cartItemProductSchema = productSchema
  .pick({
    id: true,
    name: true,
    price: true,
    category: true,
    description: true,
    image_url: true,
    remaining_stock: true,
  })
  .openapi('CartItemProduct');

const cartItemBundleSchema = bundleSchema
  .pick({
    id: true,
    name: true,
    price: true,
    category: true,
    description: true,
    image_url: true,
    bundle_items: true,
    is_hidden: true,
  })
  .openapi('CartItemBundle');

export const cartItemSchema = z
  .object({
    id: z.number().int().positive().openapi({ example: 1 }),
    cart_id: z.number().int().positive().openapi({ example: 12 }),
    product_id: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional()
      .openapi({ example: 3 }),
    bundle_id: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional()
      .openapi({ example: null }),
    quantity: z.number().int().positive().openapi({ example: 2 }),
    unit_price: z.number().nonnegative().openapi({ example: 149000 }),
    line_total: z.number().nonnegative().openapi({ example: 298000 }),
    product: cartItemProductSchema.nullable().openapi({
      description: 'Detail produk jika item merupakan produk tunggal.',
    }),
    bundle: cartItemBundleSchema.nullable().openapi({
      description: 'Detail bundle jika item merupakan bundle.',
    }),
  })
  .openapi('CartItem');

export const cartSummarySchema = z
  .object({
    total_quantity: z.number().int().nonnegative().openapi({ example: 4 }),
    total_amount: z.number().nonnegative().openapi({ example: 472000 }),
  })
  .openapi('CartSummary');

export const cartSchema = z
  .object({
    id: z.number().int().positive().openapi({ example: 5 }),
    user_id: z.number().int().positive().openapi({ example: 42 }),
    created_at: z.iso
      .datetime()
      .openapi({ example: '2025-01-01T12:00:00.000Z' }),
    updated_at: z.iso
      .datetime()
      .openapi({ example: '2025-01-02T08:15:30.000Z' }),
    deleted_at: z.iso
      .datetime()
      .nullable()
      .optional()
      .openapi({ example: null }),
    items: z.array(cartItemSchema).openapi('CartItems'),
    summary: cartSummarySchema,
  })
  .openapi('Cart');

export const cartSuccessSchema =
  createSuccessResponse(cartSchema).openapi('CartSuccess');

export const addCartItemBodySchema = z
  .object({
    productId: z.number().int().positive().optional().openapi({ example: 3 }),
    bundleId: z.number().int().positive().optional().openapi({ example: null }),
    quantity: z.number().int().positive().openapi({ example: 2 }),
  })
  .superRefine((data, ctx) => {
    const hasProduct = typeof data.productId === 'number';
    const hasBundle = typeof data.bundleId === 'number';

    if (hasProduct === hasBundle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Harus memilih salah satu antara productId atau bundleId.',
        path: ['productId'],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Harus memilih salah satu antara productId atau bundleId.',
        path: ['bundleId'],
      });
    }
  })
  .openapi('AddCartItemBody');

export const updateCartItemBodySchema = z
  .object({
    quantity: z
      .number()
      .int()
      .min(0)
      .openapi({ example: 1, description: '0 akan menghapus item.' }),
  })
  .openapi('UpdateCartItemBody');

export type Cart = z.infer<typeof cartSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type CartSummary = z.infer<typeof cartSummarySchema>;
