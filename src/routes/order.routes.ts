import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createOrderController,
  createManualOrderController,
  createManualOrderWithProofController,
  getMyOrdersController,
  getOrderByIdController,
  midtransNotificationController,
  getAllOrdersController,
  updateOrderAdminFieldsController,
  completeDummyPaymentController,
  getAdminOrderByIdController,
  uploadManualPaymentProofController,
  getManualPaymentSummaryController,
  listManualPaymentProofsController,
  reviewManualPaymentProofController,
  exportOrdersCsvController,
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
  getAdminOrderSuccessSchema,
} from '../schemas/order';
import {
  manualPaymentProofListSuccessSchema,
  manualPaymentProofStatusEnum,
  manualPaymentProofSuccessSchema,
  manualPaymentReviewBodySchema,
  manualPaymentSummarySuccessSchema,
  manualPaymentUploadSuccessSchema,
} from '../schemas/manualPayment';
import { baseErrorSchema } from '../schemas/common/response';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { userDepartmentEnum } from '../schemas/user';
import { uploadBodySchema } from '../schemas/upload';

const errorSchema = baseErrorSchema.openapi('OrderErrorResponse');

export const orderRouter = new OpenAPIHono();

type OrderHandler = Parameters<typeof orderRouter.openapi>[1];

const registerOrderRoute = (
  config: Parameters<typeof createRoute>[0],
  handler: OrderHandler,
) => orderRouter.openapi(createRoute(config), handler);

const manualOrderWithProofBodySchema = z.object({
  items: z.string().openapi({
    description: 'JSON string array of items',
    example:
      '[{"productId":1,"quantity":1},{"bundleId":2,"quantity":1,"bundleSelections":[{"productId":5,"size":"M"}]}]',
  }),
  fulfillmentMethod: z.enum(['OTS', 'Delivery']).optional(),
  deliveryDetails: z.string().optional().openapi({
    description:
      'JSON string object: { "contactName": "...", "phone": "...", "address": "...", "notes": "..." }',
  }),
  file: z.any(),
});

const exportOrdersQuerySchema = z
  .object({
    search: z.string().trim().max(255).optional(),
    department: userDepartmentEnum.optional(),
    pickup: z.enum(['taken', 'pending']).optional(),
  })
  .openapi('ExportOrdersQuery');

orderRouter.use('*', async (c, next) => {
  const path = c.req.path.toLowerCase();
  if (path.startsWith('/order/midtrans/notifications')) {
    return next();
  }
  return authMiddleware(c, next);
});

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
    method: 'post',
    path: '/manual',
    summary: 'Create a new order using manual QRIS payment',
    tags: ['Order', 'ManualPayment'],
    request: {
      body: {
        content: {
          'application/json': { schema: createOrderBodySchema },
        },
      },
    },
    responses: {
      201: {
        description: 'Manual order created',
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
  createManualOrderController as OrderHandler,
);

registerOrderRoute(
  {
    method: 'post',
    path: '/manual-with-proof',
    summary: 'Create manual order and upload proof in one request',
    tags: ['Order', 'ManualPayment'],
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: manualOrderWithProofBodySchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Manual order created with proof',
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
  createManualOrderWithProofController as OrderHandler,
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
    path: '/admin/export',
    summary: 'Export all orders as CSV',
    description:
      'Download semua pesanan berikut detail item sesuai filter dalam format CSV.',
    tags: ['Order'],
    request: {
      query: exportOrdersQuerySchema,
    },
    responses: {
      200: {
        description: 'CSV generated',
        content: { 'text/csv': { schema: z.string() } },
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
  exportOrdersCsvController as OrderHandler,
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
    method: 'get',
    path: '/admin/manual-payments',
    summary: 'List manual payment proofs (admin)',
    tags: ['ManualPayment'],
    request: {
      query: z.object({
        status: manualPaymentProofStatusEnum.optional(),
        search: z.string().trim().max(255).optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        offset: z.coerce.number().int().nonnegative().optional(),
      }),
    },
    responses: {
      200: {
        description: 'Manual payment proofs retrieved',
        content: {
          'application/json': { schema: manualPaymentProofListSuccessSchema },
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
    },
  },
  listManualPaymentProofsController as OrderHandler,
);

registerOrderRoute(
  {
    method: 'patch',
    path: '/admin/manual-payments/{id}',
    summary: 'Review manual payment proof (approve/reject)',
    tags: ['ManualPayment'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: {
        content: {
          'application/json': { schema: manualPaymentReviewBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: 'Manual payment proof reviewed',
        content: {
          'application/json': { schema: manualPaymentProofSuccessSchema },
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
        description: 'Not found',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  },
  reviewManualPaymentProofController as OrderHandler,
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
    path: '/admin/{id}',
    summary: 'Get order detail with buyer info (admin)',
    tags: ['Order'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
    },
    responses: {
      200: {
        description: 'Order retrieved',
        content: {
          'application/json': { schema: getAdminOrderSuccessSchema },
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
    },
  },
  getAdminOrderByIdController as OrderHandler,
);

registerOrderRoute(
  {
    method: 'get',
    path: '/manual/{id}/payment',
    summary: 'Get manual payment summary (QRIS + latest proof)',
    tags: ['Order', 'ManualPayment'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
    },
    responses: {
      200: {
        description: 'Manual payment summary retrieved',
        content: {
          'application/json': { schema: manualPaymentSummarySuccessSchema },
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
    },
  },
  getManualPaymentSummaryController as OrderHandler,
);

registerOrderRoute(
  {
    method: 'post',
    path: '/{id}/manual-payment/proof',
    summary: 'Upload manual payment proof (image) for an order',
    description:
      'Endpoint ini menerima form-data (multipart) dengan field `file` untuk bukti pembayaran manual.',
    tags: ['Order', 'ManualPayment'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: {
        content: {
          'multipart/form-data': {
            schema: uploadBodySchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Proof uploaded',
        content: {
          'application/json': { schema: manualPaymentUploadSuccessSchema },
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
    },
  },
  uploadManualPaymentProofController as OrderHandler,
);

registerOrderRoute(
  {
    method: 'post',
    path: '/{id}/dummy-payment',
    summary: 'Complete dummy payment for an order',
    tags: ['Order'],
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
    },
    responses: {
      200: {
        description: 'Dummy payment completed',
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
    },
  },
  completeDummyPaymentController as OrderHandler,
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
