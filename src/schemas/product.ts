import { z } from '@hono/zod-openapi';
import { createSuccessResponse, deleteResultSchema } from './common/response';

const productOptionSchema = z
  .object({
    label: z.string().trim().min(1).openapi({ example: 'Premium packaging' }),
    additional_price: z
      .number()
      .nonnegative()
      .openapi({ example: 15000, description: 'Biaya tambahan untuk opsi.' }),
  })
  .openapi('ProductOption');

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
    image_urls: z.array(z.string().url()).openapi({
      example: [
        'https://cdn.findmi.akumasukitb.com/products/hoodie-front.png',
        'https://cdn.findmi.akumasukitb.com/products/hoodie-back.png',
      ],
      description: 'Daftar URL gambar produk.',
    }),
    available_sizes: z.array(z.string().min(1)).openapi({
      description:
        'Ukuran produk yang tersedia. Kosongkan bila tidak memiliki ukuran.',
      example: ['S', 'M', 'L'],
    }),
    options: z.array(productOptionSchema).openapi({
      description: 'Daftar opsi berbayar tambahan untuk produk.',
      example: [{ label: 'Custom name', additional_price: 10000 }],
    }),
    remaining_stock: z.number().int().nonnegative().openapi({ example: 50 }),
  })
  .openapi('Product');

export const productListSchema = z.array(productSchema).openapi('ProductList');

const paginatedProductListSchema = z
  .object({
    products: productListSchema,
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  })
  .openapi('PaginatedProductList');

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
    image_urls: z
      .array(z.string().url())
      .optional()
      .openapi({
        example: [
          'https://cdn.findmi.akumasukitb.com/products/totebag-front.png',
        ],
      }),
    available_sizes: z.array(z.string().min(1)).optional().openapi({
      description: 'Daftar ukuran yang dapat dipilih (misal ["S","M","L"]).',
    }),
    options: z.array(productOptionSchema).optional(),
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
  paginatedProductListSchema,
).openapi('GetAllProductsSuccess');

export const updateProductSuccessSchema = createSuccessResponse(
  productSchema,
).openapi('UpdateProductSuccess');

export const deleteProductSuccessSchema = createSuccessResponse(
  deleteResultSchema,
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
