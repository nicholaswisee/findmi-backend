import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  getAllBundlesController,
  getBundleByIdController,
  createBundleController,
  updateBundleController,
  deleteBundleController,
  getBundleByCategoryController,
  searchBundlesController,
  updateBundleItemsController,
} from '../controllers/bundle.controller';
import {
  listingQuerySchema,
  searchQuerySchema,
} from '../schemas/common/queries';
import {
  bundleItemsJSONSchema,
  createBundleBodySchema,
  createBundleSuccessSchema,
  getAllBundlesSuccessSchema,
  getBundleSuccessSchema,
  deleteBundleSuccessSchema,
  updateBundleSuccessSchema,
  updateBundleItemsSuccessSchema,
} from '../schemas/bundle';
import { baseErrorSchema } from '../schemas/common/response';

const errorSchema = baseErrorSchema.openapi('ErrorResponse');

export const bundleRouter = new OpenAPIHono();

type BundleHandler = Parameters<typeof bundleRouter.openapi>[1];

const registerBundleRoute = (
  config: Parameters<typeof createRoute>[0],
  handler: BundleHandler,
) => bundleRouter.openapi(createRoute(config), handler);

registerBundleRoute(
  {
    method: 'get',
    path: '/',
    summary: 'Get all bundles',
    tags: ['Bundle'],
    request: {
      query: listingQuerySchema,
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: getAllBundlesSuccessSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  },
  getAllBundlesController,
);

registerBundleRoute(
  {
    method: 'get',
    path: '/search',
    summary: 'Search bundles',
    tags: ['Bundle'],
    request: { query: searchQuerySchema },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: getAllBundlesSuccessSchema } },
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
  searchBundlesController,
);

registerBundleRoute(
  {
    method: 'get',
    path: '/category/{category}',
    summary: 'Get bundles by category',
    tags: ['Bundle'],
    request: { params: z.object({ category: z.string() }) },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: getAllBundlesSuccessSchema } },
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
  getBundleByCategoryController,
);

registerBundleRoute(
  {
    method: 'get',
    path: '/{id}',
    summary: 'Get bundle by ID',
    tags: ['Bundle'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: getBundleSuccessSchema } },
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
  getBundleByIdController,
);

registerBundleRoute(
  {
    method: 'post',
    path: '/',
    summary: 'Create bundle',
    tags: ['Bundle'],
    request: {
      body: {
        content: { 'application/json': { schema: createBundleBodySchema } },
      },
    },
    responses: {
      201: {
        description: 'Created',
        content: { 'application/json': { schema: createBundleSuccessSchema } },
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
  createBundleController,
);

registerBundleRoute(
  {
    method: 'put',
    path: '/{id}',
    summary: 'Update bundle',
    tags: ['Bundle'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: {
        content: {
          'application/json': { schema: createBundleBodySchema.partial() },
        },
      },
    },
    responses: {
      200: {
        description: 'OK',
        content: { 'application/json': { schema: updateBundleSuccessSchema } },
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
  updateBundleController,
);

registerBundleRoute(
  {
    method: 'patch',
    path: '/{id}/items',
    summary: 'Update bundle items',
    tags: ['Bundle'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: {
        content: {
          'application/json': {
            schema: z.object({ newItems: bundleItemsJSONSchema }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': { schema: updateBundleItemsSuccessSchema },
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
  updateBundleItemsController,
);

registerBundleRoute(
  {
    method: 'delete',
    path: '/{id}',
    summary: 'Delete bundle',
    tags: ['Bundle'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
    },
    responses: {
      200: {
        description: 'Deleted',
        content: { 'application/json': { schema: deleteBundleSuccessSchema } },
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
  deleteBundleController,
);

export default bundleRouter;
