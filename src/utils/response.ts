import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

// Narrow the status code at the call site via generics
export function successResponse<T, S extends ContentfulStatusCode = 200>(
  c: Context,
  data: T,
  message: string = 'Success',
  status: S = 200 as S,
) {
  return c.json(
    {
      success: true,
      message,
      data,
    },
    status,
  );
}

export function errorResponse<S extends ContentfulStatusCode = 400>(
  c: Context,
  message: string = 'Something went wrong',
  status: S = 400 as S,
  details?: unknown,
) {
  return c.json(
    {
      success: false,
      message,
      ...(details ? { details } : {}),
    },
    status,
  );
}

export function paginatedResponse<T, S extends ContentfulStatusCode = 200>(
  c: Context,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Success',
  status: S = 200 as S,
) {
  return c.json(
    {
      success: true,
      message,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data,
    },
    status,
  );
}
