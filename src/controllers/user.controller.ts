import type { Context } from 'hono';
import { controller } from '../utils/controller';
import { successResponse } from '../utils/response';
import { getUsersWithOrders } from '../services/user.service';

export const getUsersWithOrdersController = controller(async (c: Context) => {
  const limitParam = c.req.query('limit');
  const offsetParam = c.req.query('offset');
  const searchParam = c.req.query('search');

  const result = await getUsersWithOrders({
    limit: limitParam ? Number(limitParam) : 20,
    offset: offsetParam ? Number(offsetParam) : 0,
    search: searchParam,
  });

  return successResponse(
    c,
    result,
    'Berhasil mengambil pengguna beserta pesanan mereka.',
  );
});
