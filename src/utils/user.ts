import type { Context } from 'hono';
import type { JWTPayload } from '../types/auth';

export function getUser(c: Context): JWTPayload | null {
  return (c.get('user') as JWTPayload | undefined) ?? null;
}

export function getUserId(c: Context): number | null {
  return getUser(c)?.userId ?? null;
}
