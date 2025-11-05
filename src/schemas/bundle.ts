import { z } from '@hono/zod-openapi';
import { createSuccessResponse, deleteResultSchema } from './common/response';

export const bundleItemSchema = z
  .object({
    product_id: z.number().int().positive().openapi({ example: 2 }),
    amount: z.number().int().positive().openapi({ example: 1 }),
  })
  .openapi('BundleItem');

export const bundleItemsJSONSchema = z
  .array(bundleItemSchema)
  .openapi('BundleItems');

export const bundleSchema = z
  .object({
    id: z.number().int().positive().openapi({ example: 1 }),
    name: z.string().min(1).openapi({ example: 'Paket AMI Merchandise' }),
    price: z.number().positive().openapi({ example: 250000 }),
    category: z.string().openapi({ example: 'Merchandise' }),
    description: z
      .string()
      .optional()
      .openapi({ example: 'Bundle spesial berisi berbagai produk AMI.' }),
    image_url: z.url().openapi({
      example: 'https://cdn.findmi.akumasukitb.com/bundles/ami-bundle.png',
    }),
    bundle_items: bundleItemsJSONSchema,
    is_hidden: z.boolean().openapi({ example: false }),
  })
  .openapi('Bundle');

export const bundleListSchema = z.array(bundleSchema).openapi('BundleList');

export const createBundleBodySchema = z
  .object({
    name: z.string().min(1).openapi({ example: 'Paket AMI Merchandise' }),
    price: z.number().positive().openapi({ example: 250000 }),
    description: z
      .string()
      .optional()
      .openapi({ example: 'Bundle spesial berisi berbagai produk AMI.' }),
    category: z.string().optional().openapi({ example: 'Merchandise' }),
    image_url: z.url().optional().openapi({
      example: 'https://cdn.findmi.akumasukitb.com/bundles/ami-bundle.png',
    }),
    bundle_items: bundleItemsJSONSchema,
    is_hidden: z.boolean().optional().openapi({ example: false }),
  })
  .openapi('CreateBundleBody');

export const updateBundleBodySchema = createBundleBodySchema
  .partial()
  .openapi('UpdateBundleBody');

export const createBundleSuccessSchema = createSuccessResponse(
  bundleSchema,
).openapi('CreateBundleSuccess');

export const getBundleSuccessSchema =
  createSuccessResponse(bundleSchema).openapi('GetBundleSuccess');

export const getAllBundlesSuccessSchema = createSuccessResponse(
  bundleListSchema,
).openapi('GetAllBundlesSuccess');

export const updateBundleSuccessSchema = createSuccessResponse(
  bundleSchema,
).openapi('UpdateBundleSuccess');

export const deleteBundleSuccessSchema = createSuccessResponse(
  deleteResultSchema,
).openapi('DeleteBundleSuccess');

export const updateBundleItemsSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    id: z.number(),
    name: z.string(),
    bundle_items: bundleItemsJSONSchema,
  }),
});

export type Bundle = z.infer<typeof bundleSchema>;
