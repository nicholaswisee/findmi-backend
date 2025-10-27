import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function successResponse<T>(
  c: Context,
  data: T,
  message = 'Success',
  status: ContentfulStatusCode = 200,
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

export function errorResponse(
  c: Context,
  message = 'Something went wrong',
  status: ContentfulStatusCode = 400,
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

export function paginatedResponse<T>(
  c: Context,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Success',
) {
  return c.json({
    success: true,
    message,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data,
  });
}
