import type { MiddlewareHandler } from 'hono';
import type { JWTPayload } from '../types/auth';
import { errorResponse } from '../utils/response';

export const adminMiddleware: MiddlewareHandler = async (c, next) => {
  const user = c.get('user') as JWTPayload | undefined;

  if (!user) {
    return errorResponse(c, 'Unauthorized', 401);
  }

  if (user.role !== 'admin') {
    return errorResponse(c, 'Forbidden', 403);
  }

  await next();
};
