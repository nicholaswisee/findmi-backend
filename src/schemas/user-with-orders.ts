import { z } from '@hono/zod-openapi';
import { createSuccessResponse } from './common/response';
import { orderWithItemsSchema } from './order';
import { userSchema } from './user';

export const userWithOrdersSchema = userSchema
  .extend({
    orders: z.array(orderWithItemsSchema).openapi('UserOrders'),
  })
  .openapi('UserWithOrders');

export const usersWithOrdersSuccessSchema = createSuccessResponse(
  z.object({
    total: z.number().int().nonnegative().openapi({ example: 128 }),
    limit: z.number().int().positive().openapi({ example: 20 }),
    offset: z.number().int().nonnegative().openapi({ example: 0 }),
    users: z.array(userWithOrdersSchema),
  }),
).openapi('UsersWithOrdersSuccess');
