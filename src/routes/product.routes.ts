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
import {
  listingQuerySchema,
  searchQuerySchema,
} from '../schemas/common/queries';
import { baseErrorSchema } from '../schemas/common/response';
import { adminMiddleware } from '../middlewares/admin.middleware';

const errorSchema = baseErrorSchema.openapi('ErrorResponse');

export const productRouter = new OpenAPIHono();

type ProductHandler = Parameters<typeof productRouter.openapi>[1];

const registerProductRoute = (
  config: Parameters<typeof createRoute>[0],
  handler: ProductHandler,
) => productRouter.openapi(createRoute(config), handler);

productRouter.use('*', async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') {
    return next();
  }

  // Only admins are allowed to perform mutating product operations
  return adminMiddleware(c, next);
});

registerProductRoute(
  {
    method: 'get',
    path: '/',
    summary: 'Get all products',
    tags: ['Product'],
    request: {
      query: listingQuerySchema,
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
  },
  getAllProductsController,
);

registerProductRoute(
  {
    method: 'get',
    path: '/search',
    summary: 'Search products',
    tags: ['Product'],
    request: { query: searchQuerySchema },
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
  },
  searchProductsController,
);

registerProductRoute(
  {
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
  },
  getProductsByCategoryController,
);

registerProductRoute(
  {
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
  },
  getProductByIdController,
);

registerProductRoute(
  {
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
  },
  createProductController,
);

registerProductRoute(
  {
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
  },
  updateProductController,
);

registerProductRoute(
  {
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
  },
  updateProductStockController,
);

registerProductRoute(
  {
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
  },
  deleteProductController,
);

export default productRouter;
