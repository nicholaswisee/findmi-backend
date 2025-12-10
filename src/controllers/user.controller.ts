import type { Context } from 'hono';
import { controller } from '../utils/controller';
import { successResponse, errorResponse } from '../utils/response';
import {
  getUsersWithOrders,
  updateMyProfile,
  updateUser,
} from '../services/user.service';
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

export const updateUserController = controller(async (c: Context) => {
  try {
    const userId = Number(c.req.param('id'));
    const body = await c.req.json();

    const updatedUser = await updateUser(userId, body);

    return successResponse(c, updatedUser, 'Berhasil memperbarui pengguna.');
  } catch (err) {
    return errorResponse(c, (err as Error).message, 404);
  }
});

export const updateMyProfileController = controller(async (c: Context) => {
  try {
    const userId = Number(c.get('user')?.userId);
    if (!userId) {
      return errorResponse(c, 'Tidak memiliki akses.', 401);
    }

    const body = await c.req.json();
    const updatedUser = await updateMyProfile(userId, body);

    return successResponse(
      c,
      updatedUser,
      'Profil berhasil diperbarui (termasuk NIM jika diisi).',
    );
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400);
  }
});
