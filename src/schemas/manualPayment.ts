import { z } from '@hono/zod-openapi';
import { createSuccessResponse } from './common/response';
import {
  orderPaymentMethodEnum,
  orderPaymentStatusEnum,
  orderSchema,
} from './order';
import { userSchema } from './user';

export const manualPaymentProofStatusEnum = z
  .enum(['Pending', 'Approved', 'Rejected'])
  .openapi({
    description: 'Status verifikasi bukti pembayaran manual.',
    example: 'Pending',
  });

export const manualPaymentProofSchema = z
  .object({
    id: z.number().int(),
    order_id: z.number().int(),
    user_id: z.number().int(),
    image_url: z.string().url(),
    storage_provider: z.string(),
    storage_key: z.string().nullable(),
    status: manualPaymentProofStatusEnum,
    reviewer_id: z.number().int().nullable(),
    reviewer_note: z.string().nullable(),
    reviewed_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .openapi('ManualPaymentProof');

export const manualPaymentSummarySchema = z
  .object({
    order_id: z.number().int(),
    payment_method: orderPaymentMethodEnum,
    payment_status: orderPaymentStatusEnum,
    total_amount: z.string(),
    qris_image_url: z.string().url(),
    instructions: z.string(),
    contact: z.string(),
    expires_at: z.string().nullable(),
    latest_proof: manualPaymentProofSchema.nullable(),
  })
  .openapi('ManualPaymentSummary');

export const manualPaymentProofWithOrderSchema = manualPaymentProofSchema
  .extend({
    order: orderSchema
      .pick({
        id: true,
        total_amount: true,
        payment_status: true,
        transaction_id: true,
        created_at: true,
      })
      .openapi('ManualPaymentOrderSummary'),
    user: userSchema
      .pick({
        id: true,
        name: true,
        nim: true,
        department: true,
      })
      .openapi('ManualPaymentUserSummary'),
  })
  .openapi('ManualPaymentProofWithRelations');

export const manualPaymentUploadSuccessSchema = createSuccessResponse(
  z.object({
    proof: manualPaymentProofSchema,
    order_id: z.number().int(),
    payment_status: orderPaymentStatusEnum,
  }),
).openapi('ManualPaymentUploadSuccess');

export const manualPaymentSummarySuccessSchema = createSuccessResponse(
  manualPaymentSummarySchema,
).openapi('ManualPaymentSummarySuccess');

export const manualPaymentProofListSuccessSchema = createSuccessResponse(
  z.object({
    proofs: z.array(manualPaymentProofWithOrderSchema),
    total: z.number().int().nonnegative(),
  }),
).openapi('ManualPaymentProofListSuccess');

export const manualPaymentReviewBodySchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    note: z.string().trim().max(500).optional(),
  })
  .openapi('ManualPaymentReviewBody');

export const manualPaymentProofSuccessSchema = createSuccessResponse(
  manualPaymentProofSchema,
).openapi('ManualPaymentProofSuccess');
