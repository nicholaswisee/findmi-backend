import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import {
  getUsersWithOrdersController,
  updateUserController,
} from '../controllers/user.controller';
import {
  baseErrorSchema,
  userDepartmentEnum,
  usersWithOrdersSuccessSchema,
  updateUserBodySchema,
  updateUserParamsSchema,
  updateUserSuccessSchema,
} from '../schemas';

export const userRouter = new OpenAPIHono();

userRouter.use('*', authMiddleware);

type UserHandler = Parameters<typeof userRouter.openapi>[1];

const registerUserRoute = (
  config: Parameters<typeof createRoute>[0],
  handler: UserHandler,
) => userRouter.openapi(createRoute(config), handler);

const querySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
    search: z.string().optional(),
    department: userDepartmentEnum.optional(),
  })
  .openapi('UserOrdersQuery');

const errorSchema = baseErrorSchema.openapi('UserRouteError');

registerUserRoute(
  {
    method: 'get',
    path: '/',
    summary: 'List users with their orders',
    description:
      'Return paginated users enriched with all orders they have placed. Restricted to admin.',
    tags: ['User'],
    middleware: [adminMiddleware],
    request: {
      query: querySchema,
    },
    responses: {
      200: {
        description: 'Users retrieved successfully',
        content: {
          'application/json': { schema: usersWithOrdersSuccessSchema },
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
  getUsersWithOrdersController as UserHandler,
);

registerUserRoute(
  {
    method: 'patch',
    path: '/{id}',
    summary: 'Update user data',
    description:
      'Update user information such as name, no_wa, department, division, rank, nim, line_id.',
    tags: ['User'],
    request: {
      params: updateUserParamsSchema,
      body: {
        content: {
          'application/json': { schema: updateUserBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: 'User updated successfully',
        content: {
          'application/json': { schema: updateUserSuccessSchema },
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
      404: {
        description: 'User not found',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  },
  updateUserController as UserHandler,
);

export default userRouter;
