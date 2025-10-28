import { verify } from 'hono/jwt';
import { errorResponse } from '../utils/response';
const JWT_SECRET = process.env.JWT_SECRET!;

export async function authMiddleware(c: any, next: any) {
  const cookieHeader = c.req.header('Cookie') || '';
  const match = /ami_session=([^;]+)/.exec(cookieHeader);
  if (!match) return errorResponse(c, 'Unauthorized', 401);

  const token = decodeURIComponent(match[1]);

  try {
    const payload = await verify(token, JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch (err) {
    return errorResponse(c, 'Invalid or expired session', 401);
  }
}
