import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  getAllProductsController,
  getProductByIdController,
  createProductController,
  updateProductController,
  deleteProductController,
  getProductsByCategoryController,
  searchProductsController,
  updateProductStockController,
} from '../controllers/product.controller';
import {
  createProductBodySchema,
  updateProductBodySchema,
  createProductSuccessSchema,
  getProductSuccessSchema,
  getAllProductsSuccessSchema,
  updateProductSuccessSchema,
  deleteProductSuccessSchema,
  updateStockSuccessSchema,
} from '../schemas/product';
import { baseErrorSchema } from '../schemas/common/response';

const errorSchema = baseErrorSchema.openapi('ErrorResponse');

export const productRouter = new OpenAPIHono();

productRouter.openapi(
  createRoute({
    method: 'get',
    path: '/',
    summary: 'Get all products',
    tags: ['Product'],
    request: {
      query: z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(['latest', 'price_asc', 'price_desc']).optional(),
        limit: z.coerce.number().min(1).max(100).optional(),
        offset: z.coerce.number().min(0).optional(),
      }),
    },
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': { schema: getAllProductsSuccessSchema },
        },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  getAllProductsController,
);
productRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    summary: 'Get product by ID',
    tags: ['Product'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: getProductSuccessSchema } },
      },
      400: {
        description: 'Bad request',
        content: { 'application/json': { schema: errorSchema } },
      },
      404: {
        description: 'Not found',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  getProductByIdController,
);
productRouter.openapi(
  createRoute({
    method: 'post',
    path: '/',
    summary: 'Create product',
    tags: ['Product'],
    request: {
      body: {
        content: { 'application/json': { schema: createProductBodySchema } },
      },
    },
    responses: {
      201: {
        description: 'Created',
        content: { 'application/json': { schema: createProductSuccessSchema } },
      },
      400: {
        description: 'Bad request',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  createProductController,
);
productRouter.openapi(
  createRoute({
    method: 'put',
    path: '/{id}',
    summary: 'Update product',
    tags: ['Product'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: {
        content: { 'application/json': { schema: updateProductBodySchema } },
      },
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: updateProductSuccessSchema } },
      },
      400: {
        description: 'Bad request',
        content: { 'application/json': { schema: errorSchema } },
      },
      404: {
        description: 'Not found',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  updateProductController,
);
productRouter.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}',
    summary: 'Delete product',
    tags: ['Product'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
    },
    responses: {
      200: {
        description: 'Deleted',
        content: { 'application/json': { schema: deleteProductSuccessSchema } },
      },
      400: {
        description: 'Bad request',
        content: { 'application/json': { schema: errorSchema } },
      },
      404: {
        description: 'Not found',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  deleteProductController,
);
productRouter.openapi(
  createRoute({
    method: 'get',
    path: '/category/{category}',
    summary: 'Get products by category',
    tags: ['Product'],
    request: { params: z.object({ category: z.string() }) },
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': { schema: getAllProductsSuccessSchema },
        },
      },
      400: {
        description: 'Bad request',
        content: { 'application/json': { schema: errorSchema } },
      },
      404: {
        description: 'Not found',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  getProductsByCategoryController,
);
productRouter.openapi(
  createRoute({
    method: 'get',
    path: '/search',
    summary: 'Search products',
    tags: ['Product'],
    request: { query: z.object({ keyword: z.string().min(1) }) },
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': { schema: getAllProductsSuccessSchema },
        },
      },
      400: {
        description: 'Bad request',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  searchProductsController,
);

productRouter.openapi(
  createRoute({
    method: 'patch',
    path: '/{id}/stock',
    summary: 'Update product stock',
    tags: ['Product'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: {
        content: {
          'application/json': {
            schema: z.object({ remaining_quantity: z.number() }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: updateStockSuccessSchema } },
      },
      400: {
        description: 'Bad request',
        content: { 'application/json': { schema: errorSchema } },
      },
      404: {
        description: 'Not found',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  updateProductStockController,
);

export default productRouter;
