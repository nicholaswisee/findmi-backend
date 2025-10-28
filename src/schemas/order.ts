import { z } from '@hono/zod-openapi';

export const orderPaymentStatusEnum = z
  .enum(['Pending', 'Paid', 'Failed', 'Refunded'])
  .openapi({
    description: 'Current payment status of an order',
    example: 'Pending',
  });

export const orderPaymentMethodEnum = z
  .enum(['Manual', 'Xendit', 'Midtrans', 'GoPay'])
  .openapi({
    description: 'Payment method used in the order',
    example: 'Xendit',
  });

export const orderSchema = z.object({
  id: z.number().int(),
  user_id: z.number().int(),
  total_amount: z.string(),
  payment_status: orderPaymentStatusEnum,
  payment_method: orderPaymentMethodEnum,
  transaction_id: z.string().nullable().optional(),
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

export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
