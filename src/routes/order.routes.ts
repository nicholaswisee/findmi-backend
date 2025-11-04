import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createOrderController,
  getMyOrdersController,
  getOrderByIdController,
  midtransNotificationController,
} from '../controllers/order.controller';
import {
  createOrderBodySchema,
  createOrderSuccessSchema,
  listOrdersSuccessSchema,
  getOrderSuccessSchema,
  midtransNotificationBodySchema,
  midtransNotificationSuccessSchema,
} from '../schemas/order';
import { baseErrorSchema } from '../schemas/common/response';

const errorSchema = baseErrorSchema.openapi('OrderErrorResponse');

export const orderRouter = new OpenAPIHono();

type OrderHandler = Parameters<typeof orderRouter.openapi>[1];

const registerOrderRoute = (
  config: Parameters<typeof createRoute>[0],
  handler: OrderHandler,
) => orderRouter.openapi(createRoute(config), handler);

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
        content: {
          'application/json': { schema: listOrdersSuccessSchema },
        },
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
