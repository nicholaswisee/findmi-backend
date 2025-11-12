import type { MiddlewareHandler } from 'hono';
import type { JWTPayload } from '../types/auth';
import { errorResponse } from '../utils/response';

export const adminMiddleware: MiddlewareHandler = async (c, next) => {
  const user = c.get('user') as JWTPayload | undefined;

  if (!user) {
    return errorResponse(c, 'Tidak memiliki akses.', 401);
  }

  if (user.role !== 'admin') {
    return errorResponse(c, 'Tidak memiliki izin.', 403);
  }

  await next();
};
