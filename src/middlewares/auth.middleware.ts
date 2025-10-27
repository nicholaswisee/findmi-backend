// src/middlewares/auth.middleware.ts
import type { Context, Next } from 'hono';
import { errorResponse } from '../utils/response';
import jwt from 'hono/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(c, 'Missing or invalid Authorization header', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch (err) {
    return errorResponse(c, 'Invalid or expired token', 401, err);
  }
}
