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

export const orderFulfillmentMethodEnum = z.enum(['OTS', 'Delivery']).openapi({
  description: 'Metode pemenuhan pesanan (ambil di tempat atau kirim).',
  example: 'OTS',
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
  fulfillment_method: orderFulfillmentMethodEnum,
  delivery_fee: z.string(),
  delivery_contact_name: z.string().nullable(),
  delivery_phone: z.string().nullable(),
  delivery_address: z.string().nullable(),
  delivery_notes: z.string().nullable(),
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
  selected_size: z.string().min(1).max(64).nullable().optional().openapi({
    description: 'Ukuran produk yang dipilih jika item adalah produk tunggal.',
    example: 'M',
  }),
  selected_bundle_items: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        size: z.string().min(1),
      }),
    )
    .openapi({
      description: 'Pilihan ukuran untuk setiap produk dalam bundle.',
    }),
});

const orderItemProductSchema = productSchema
  .pick({
    id: true,
    name: true,
    price: true,
    category: true,
    description: true,
    image_urls: true,
    remaining_stock: true,
    available_sizes: true,
  })
  .openapi('OrderItemProduct');

const orderItemBundleSchema = bundleSchema
  .pick({
    id: true,
    name: true,
    price: true,
    category: true,
    description: true,
    image_urls: true,
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
    size: z.string().trim().min(1).max(64).optional().openapi({
      description: 'Ukuran yang dipilih untuk produk (abaikan untuk bundle).',
      example: 'L',
    }),
    bundleSelections: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          size: z
            .string()
            .trim()
            .min(1)
            .max(64)
            .optional()
            .openapi({ description: 'Ukuran yang dipilih' }),
        }),
      )
      .optional()
      .openapi({
        description:
          'Pilihan ukuran untuk setiap produk yang termasuk di dalam bundle.',
      }),
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
    fulfillmentMethod: orderFulfillmentMethodEnum,
    paymentMethod: orderPaymentMethodEnum.default('Midtrans'),
    deliveryDetails: z
      .object({
        contactName: z.string().trim().min(1).max(255),
        phone: z.string().trim().min(5).max(64),
        address: z.string().trim().min(5),
        notes: z.string().trim().max(500).optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.fulfillmentMethod === 'Delivery') {
      if (!value.deliveryDetails) {
        ctx.addIssue({
          code: 'custom',
          message: 'Delivery details wajib diisi untuk pengiriman.',
          path: ['deliveryDetails'],
        });
      }
    }
  })
  .openapi('CreateOrderBody');

export const paymentInitiationSchema = z
  .object({
    provider: z.string().openapi({ example: 'DummyPay' }),
    transactionId: z.string().optional(),
    transactionToken: z.string().optional(),
    status: z.enum(['PENDING', 'PAID', 'FAILED']).optional(),
    checkoutUrl: z.string().url().optional(),
    checkoutPath: z.string().optional(),
    expiresAt: z.string().optional(),
    instructions: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .nullable()
  .openapi('PaymentInitiation');

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

const paginatedOrderWithUserSchema = z
  .object({
    orders: z.array(orderWithUserSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  })
  .openapi('PaginatedOrderWithUser');

export const listAdminOrdersSuccessSchema = createSuccessResponse(
  paginatedOrderWithUserSchema,
).openapi('ListAdminOrdersSuccess');

export const getOrderSuccessSchema =
  createSuccessResponse(orderWithItemsSchema).openapi('GetOrderSuccess');

export const getAdminOrderSuccessSchema = createSuccessResponse(
  orderWithUserSchema,
).openapi('GetAdminOrderSuccess');

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
