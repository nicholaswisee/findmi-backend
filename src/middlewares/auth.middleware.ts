import { getCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import { errorResponse } from '../utils/response';
import { verify } from 'hono/jwt';

const JWT_SECRET = process.env.JWT_SECRET!;

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, 'ami_session');
  if (!token) return errorResponse(c, 'Unauthorized', 401);

  try {
    const payload = await verify(token, JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch {
    return errorResponse(c, 'Invalid or expired session', 401);
  }
};
