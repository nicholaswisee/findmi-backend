import type { Context } from 'hono';
import { controller } from '../utils/controller';
import { successResponse } from '../utils/response';
import { getRevenueAnalytics } from '../services/analytics.service';
import type { UserDepartmentEnum } from '../schemas';

export const getRevenueAnalyticsController = controller(async (c: Context) => {
  const departmentParam = c.req.query('department');

  const data = await getRevenueAnalytics({
    department: departmentParam as UserDepartmentEnum | undefined,
  });

  return successResponse(
    c,
    data,
    'Berhasil mengambil data analitik pendapatan.',
  );
});
