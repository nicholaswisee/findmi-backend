import type { Context, Next } from 'hono';
import { errorResponse } from '../utils/response';

export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next();
  } catch (err) {
    console.error('Unhandled error:', err);

    return errorResponse(
      c,
      'Internal server error',
      500,
      process.env.NODE_ENV !== 'production' ? err : undefined,
    );
  }
}
