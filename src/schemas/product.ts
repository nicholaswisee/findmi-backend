import { z } from '@hono/zod-openapi';
import { createSuccessResponse } from './common/response';

export const productSchema = z
  .object({
    id: z.number().int().positive().openapi({ example: 1 }),
    name: z.string().min(1).openapi({ example: 'FindMI Hoodie 2026' }),
    price: z.number().positive().openapi({ example: 149000 }),
    category: z.string().openapi({ example: 'Fundraising' }),
    description: z
      .string()
      .optional()
      .openapi({ example: 'Comfortable oversized hoodie with AMI 2026 logo.' }),
    image_url: z.url().openapi({
      example: 'https://cdn.findmi.akumasukitb.com/products/hoodie.png',
    }),
    remaining_stock: z.number().int().nonnegative().openapi({ example: 50 }),
  })
  .openapi('Product');

export const productListSchema = z.array(productSchema).openapi('ProductList');

export const createProductBodySchema = z
  .object({
    name: z.string().min(1).openapi({ example: 'FindMI Tote Bag' }),
    price: z.number().positive().openapi({ example: 79000 }),
    description: z
      .string()
      .optional()
      .openapi({ example: 'Durable eco-friendly tote bag for daily use.' }),
    stock: z.number().int().nonnegative().openapi({ example: 120 }),
    category: z.string().optional().openapi({ example: 'Fundraising' }),
    imageUrl: z.url().optional().openapi({
      example: 'https://cdn.findmi.akumasukitb.com/products/totebag.png',
    }),
  })
  .openapi('CreateProductBody');

export const updateProductBodySchema = createProductBodySchema
  .partial()
  .openapi('UpdateProductBody');

export const createProductSuccessSchema = createSuccessResponse(
  productSchema,
).openapi('CreateProductSuccess');

export const getProductSuccessSchema =
  createSuccessResponse(productSchema).openapi('GetProductSuccess');

export const getAllProductsSuccessSchema = createSuccessResponse(
  productListSchema,
).openapi('GetAllProductsSuccess');

export const updateProductSuccessSchema = createSuccessResponse(
  productSchema,
).openapi('UpdateProductSuccess');

export const deleteProductSuccessSchema = createSuccessResponse(
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Produk berhasil dihapus.' }),
    deletedCount: z.number().optional().openapi({ example: 1 }),
  }),
).openapi('DeleteProductSuccess');

export const updateStockSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    id: z.number(),
    name: z.string(),
    remaining_stock: z.number(),
  }),
});

export type Product = z.infer<typeof productSchema>;
