import type { Context } from 'hono';
import { controller } from '../utils/controller';
import { successResponse } from '../utils/response';
import { getUsersWithOrders } from '../services/user.service';
import type { UserDepartmentEnum } from '../schemas';

export const getUsersWithOrdersController = controller(async (c: Context) => {
  const limitParam = c.req.query('limit');
  const offsetParam = c.req.query('offset');
  const searchParam = c.req.query('search');
  const departmentParam = c.req.query('department');

  const result = await getUsersWithOrders({
    limit: limitParam ? Number(limitParam) : 20,
    offset: offsetParam ? Number(offsetParam) : 0,
    search: searchParam,
    department: departmentParam as UserDepartmentEnum | undefined,
  });

  return successResponse(
    c,
    result,
    'Berhasil mengambil pengguna beserta pesanan mereka.',
  );
});
