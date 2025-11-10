import { z } from '@hono/zod-openapi';
import { createSuccessResponse } from './common/response';
import { productSchema } from './product';
import { bundleSchema } from './bundle';
import { userSchema } from './user';

export const orderPaymentStatusEnum = z
  .enum(['Pending', 'Paid', 'Failed', 'Refunded'])
  .openapi({
    description: 'Current payment status of an order',
    example: 'Pending',
  });

export const orderPaymentMethodEnum = z.enum(['Manual', 'Midtrans']).openapi({
  description: 'Payment method used in the order',
  example: 'Midtrans',
});

export const orderSchema = z.object({
  id: z.number().int(),
  user_id: z.number().int(),
  total_amount: z.string(),
  payment_status: orderPaymentStatusEnum,
  payment_method: orderPaymentMethodEnum,
  transaction_id: z.string().nullable().optional(),
  admin_note: z.string().nullable().optional(),
  is_taken: z.boolean().default(false),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const orderItemSchema = z.object({
  id: z.number().int(),
  order_id: z.number().int(),
  product_id: z.number().int().nullable().optional(),
  bundle_id: z.number().int().nullable().optional(),
  quantity: z.number().int(),
  unit_price: z.string(),
});

const orderItemProductSchema = productSchema
  .pick({
    id: true,
    name: true,
    price: true,
    category: true,
    description: true,
    image_url: true,
    remaining_stock: true,
  })
  .openapi('OrderItemProduct');

const orderItemBundleSchema = bundleSchema
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
  .openapi('OrderItemBundle');

export const orderItemDetailedSchema = orderItemSchema
  .extend({
    product: orderItemProductSchema.nullable(),
    bundle: orderItemBundleSchema.nullable(),
  })
  .openapi('OrderItemDetailed');

export const orderWithItemsSchema = orderSchema
  .extend({
    items: z.array(orderItemDetailedSchema).openapi('OrderItems'),
  })
  .openapi('OrderWithItems');

export const orderWithUserSchema = orderWithItemsSchema
  .extend({
    user: userSchema,
  })
  .openapi('OrderWithUser');

export const createOrderItemBodySchema = z
  .object({
    productId: z.number().int().positive().optional(),
    bundleId: z.number().int().positive().optional(),
    quantity: z.number().int().positive(),
  })
  .superRefine((value, ctx) => {
    const hasProduct = typeof value.productId === 'number';
    const hasBundle = typeof value.bundleId === 'number';
    if (hasProduct === hasBundle) {
      ctx.addIssue({
        code: 'custom',
        message: 'Pilih salah satu antara productId atau bundleId.',
        path: ['productId'],
      });
      ctx.addIssue({
        code: 'custom',
        message: 'Pilih salah satu antara productId atau bundleId.',
        path: ['bundleId'],
      });
    }
  })
  .openapi('CreateOrderItemBody');

export const createOrderBodySchema = z
  .object({
    items: z.array(createOrderItemBodySchema).min(1),
  })
  .openapi('CreateOrderBody');

export const paymentInitiationSchema = z
  .object({
    provider: z.literal('Midtrans'),
    transactionId: z.string().optional(),
    transactionToken: z.string().optional(),
    redirectUrl: z.url().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    todo: z
      .string()
      .optional()
      .default('Integrasi Midtrans belum diimplementasikan.'),
  })
  .nullable()
  .openapi('MidtransPaymentInitiation');

export const createOrderSuccessSchema = createSuccessResponse(
  z.object({
    order: orderWithItemsSchema,
    payment: paymentInitiationSchema,
  }),
).openapi('CreateOrderSuccess');

export const orderListSchema = z
  .array(orderWithItemsSchema)
  .openapi('OrderList');

export const listOrdersSuccessSchema =
  createSuccessResponse(orderListSchema).openapi('ListOrdersSuccess');

export const listAdminOrdersSuccessSchema = createSuccessResponse(
  z.array(orderWithUserSchema),
).openapi('ListAdminOrdersSuccess');

export const getOrderSuccessSchema =
  createSuccessResponse(orderWithItemsSchema).openapi('GetOrderSuccess');

export const midtransNotificationBodySchema = z
  .record(z.string(), z.any())
  .openapi('MidtransNotificationBody');

export const midtransNotificationSuccessSchema = createSuccessResponse(
  z.object({
    received: z.boolean().default(true),
    message: z
      .string()
      .default('Notifikasi Midtrans diterima. Implementasi masih TODO.'),
  }),
).openapi('MidtransNotificationSuccess');

export const updateOrderAdminBodySchema = z
  .object({
    admin_note: z.string().trim().max(1000).nullable().optional().openapi({
      description: 'Catatan internal admin terkait pesanan.',
      example: 'Order siap diambil jam 15.00',
    }),
    is_taken: z
      .boolean()
      .optional()
      .openapi({ description: 'Status apakah pesanan sudah diambil.' }),
  })
  .refine(
    (value) =>
      typeof value.admin_note !== 'undefined' ||
      typeof value.is_taken !== 'undefined',
    {
      message: 'Minimal pilih salah satu field untuk diperbarui.',
      path: ['admin_note'],
    },
  )
  .openapi('UpdateOrderAdminBody');

export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderWithItems = z.infer<typeof orderWithItemsSchema>;
export type OrderWithUser = z.infer<typeof orderWithUserSchema>;
