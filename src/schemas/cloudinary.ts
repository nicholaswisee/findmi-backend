import { z } from '@hono/zod-openapi';
import { createSuccessResponse } from './common/response';

export const cloudinarySignatureBodySchema = z
  .object({
    folder: z
      .string()
      .min(1)
      .optional()
      .openapi({ example: 'findmi/products' }),
    publicId: z.string().min(1).optional().openapi({ example: 'product-123' }),
    eager: z.string().optional().openapi({
      example: 'c_fill,w_300,h_300|c_fill,w_600,h_600',
      description: 'Optional eager transformations for the upload.',
    }),
    tags: z
      .array(z.string().min(1))
      .optional()
      .openapi({ example: ['product', 'featured'] }),
    overwrite: z.boolean().optional().openapi({
      example: true,
      description: 'Allow overwriting existing asset',
    }),
    invalidate: z.boolean().optional().openapi({
      example: false,
      description: 'Whether to invalidate the CDN cache for overwritten assets',
    }),
  })
  .openapi('CloudinarySignatureBody');

export const cloudinarySignatureSchema = z
  .object({
    signature: z.string().openapi({
      example: '4f73c79f0f8d6bfa2b8b02fe5ac3b61bffedbe44',
    }),
    timestamp: z.number().int().openapi({
      example: 1730985600,
      description: 'Unix timestamp used for the signature',
    }),
    apiKey: z.string().openapi({ example: '123456789012345' }),
    cloudName: z.string().openapi({ example: 'findmi-cloud' }),
    folder: z
      .string()
      .optional()
      .openapi({ example: 'findmi/products', nullable: true }),
    publicId: z
      .string()
      .optional()
      .openapi({ example: 'product-123', nullable: true }),
  })
  .openapi('CloudinarySignature');

export const cloudinarySignatureSuccessSchema = createSuccessResponse(
  cloudinarySignatureSchema,
).openapi('CloudinarySignatureSuccess');
