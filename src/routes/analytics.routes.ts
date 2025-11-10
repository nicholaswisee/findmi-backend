import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { getRevenueAnalyticsController } from '../controllers/analytics.controller';
import { baseErrorSchema, userDepartmentEnum } from '../schemas';

const analyticsRouter = new OpenAPIHono();

analyticsRouter.use('*', authMiddleware);
analyticsRouter.use('*', adminMiddleware);

const querySchema = z
  .object({
    department: userDepartmentEnum.optional(),
  })
  .openapi('AnalyticsQuery');

const analyticsRoute = createRoute({
  method: 'get',
  path: '/dashboard',
  summary: 'Revenue analytics',
  description:
    'Return aggregated revenue metrics, breakdowns, and recent paid orders. Restricted to admin users.',
  tags: ['Analytics'],
  request: {
    query: querySchema,
  },
  responses: {
    200: {
      description: 'Analytics data fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: z.any(),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: baseErrorSchema } },
    },
    403: {
      description: 'Forbidden',
      content: { 'application/json': { schema: baseErrorSchema } },
    },
    500: {
      description: 'Server error',
      content: { 'application/json': { schema: baseErrorSchema } },
    },
  },
});

analyticsRouter.openapi(analyticsRoute, getRevenueAnalyticsController);

export default analyticsRouter;
