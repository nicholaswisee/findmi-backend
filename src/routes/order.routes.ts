import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createOrderController,
  getMyOrdersController,
  getOrderByIdController,
  midtransNotificationController,
  getAllOrdersController,
  updateOrderAdminFieldsController,
} from '../controllers/order.controller';
import {
  createOrderBodySchema,
  createOrderSuccessSchema,
  listOrdersSuccessSchema,
  getOrderSuccessSchema,
  midtransNotificationBodySchema,
  midtransNotificationSuccessSchema,
  updateOrderAdminBodySchema,
  listAdminOrdersSuccessSchema,
} from '../schemas/order';
import { baseErrorSchema } from '../schemas/common/response';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { userDepartmentEnum } from '../schemas/user';

const errorSchema = baseErrorSchema.openapi('OrderErrorResponse');

export const orderRouter = new OpenAPIHono();

type OrderHandler = Parameters<typeof orderRouter.openapi>[1];

const registerOrderRoute = (
  config: Parameters<typeof createRoute>[0],
  handler: OrderHandler,
) => orderRouter.openapi(createRoute(config), handler);

orderRouter.use('/admin', authMiddleware);
orderRouter.use('/admin/*', authMiddleware);
orderRouter.use('/admin', adminMiddleware);
orderRouter.use('/admin/*', adminMiddleware);

registerOrderRoute(
  {
    method: 'post',
    path: '/midtrans/notifications',
    summary: 'Midtrans payment notification webhook',
    tags: ['Order'],
    request: {
      body: {
        content: {
          'application/json': { schema: midtransNotificationBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: 'Notification received',
        content: {
          'application/json': { schema: midtransNotificationSuccessSchema },
        },
      },
    },
  },
  midtransNotificationController as OrderHandler,
);

registerOrderRoute(
  {
    method: 'post',
    path: '/',
    summary: 'Create a new order',
    tags: ['Order'],
    request: {
      body: {
        content: {
          'application/json': { schema: createOrderBodySchema },
        },
      },
    },
    responses: {
      201: {
        description: 'Order created',
        content: {
          'application/json': { schema: createOrderSuccessSchema },
        },
      },
      400: {
        description: 'Bad request',
        content: { 'application/json': { schema: errorSchema } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  },
  createOrderController as OrderHandler,
);

registerOrderRoute(
  {
    method: 'get',
    path: '/',
    summary: 'List my orders',
    tags: ['Order'],
    request: {
      query: z.object({
        limit: z.coerce.number().int().positive().max(100).optional(),
        offset: z.coerce.number().int().nonnegative().optional(),
      }),
    },
    responses: {
      200: {
        description: 'Orders retrieved',
        content: { 'application/json': { schema: listOrdersSuccessSchema } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  },
  getMyOrdersController as OrderHandler,
);

registerOrderRoute(
  {
    method: 'get',
    path: '/admin',
    summary: 'List all orders (admin)',
    tags: ['Order'],
    request: {
      query: z.object({
        limit: z.coerce.number().int().positive().max(100).optional(),
        offset: z.coerce.number().int().nonnegative().optional(),
        search: z.string().trim().max(255).optional(),
        department: userDepartmentEnum.optional(),
        pickup: z.enum(['taken', 'pending']).optional(),
      }),
    },
    responses: {
      200: {
        description: 'Orders retrieved',
        content: {
          'application/json': { schema: listAdminOrdersSuccessSchema },
        },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  },
  getAllOrdersController as OrderHandler,
);

registerOrderRoute(
  {
    method: 'patch',
    path: '/admin/{id}',
    summary: 'Update admin note and taken status on an order',
    tags: ['Order'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: {
        content: {
          'application/json': { schema: updateOrderAdminBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: 'Order updated',
        content: {
          'application/json': { schema: getOrderSuccessSchema },
        },
      },
      400: {
        description: 'Bad request',
        content: { 'application/json': { schema: errorSchema } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: errorSchema } },
      },
      404: {
        description: 'Order not found',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  },
  updateOrderAdminFieldsController as OrderHandler,
);

registerOrderRoute(
  {
    method: 'get',
    path: '/{id}',
    summary: 'Get order detail',
    tags: ['Order'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
    },
    responses: {
      200: {
        description: 'Order retrieved',
        content: {
          'application/json': { schema: getOrderSuccessSchema },
        },
      },
      400: {
        description: 'Bad request',
        content: { 'application/json': { schema: errorSchema } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      404: {
        description: 'Order not found',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  },
  getOrderByIdController as OrderHandler,
);

export default orderRouter;
