import type { Context } from 'hono';
import { successResponse, errorResponse } from '../utils/response';
import { controller } from '../utils/controller';
import { getUserId } from '../utils/user';
import {
  createOrder,
  getOrderForUser,
  getOrdersForUser,
  handleMidtransNotification,
} from '../services/order.service';

export const createOrderController = controller(async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) return errorResponse(c, 'Unauthorized', 401);

  const body = await c.req.json<{
    items: Array<{ productId?: number; bundleId?: number; quantity: number }>;
  }>();

  const result = await createOrder(userId, { items: body.items });

  return successResponse(
    c,
    result,
    'Pesanan berhasil dibuat. Integrasi Midtrans masih dalam pengembangan.',
    201,
  );
});

export const getMyOrdersController = controller(async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) return errorResponse(c, 'Unauthorized', 401);

  const limit = c.req.query('limit');
  const offset = c.req.query('offset');

  const orders = await getOrdersForUser(userId, {
    limit: limit ? Number(limit) : 20,
    offset: offset ? Number(offset) : 0,
  });

  return successResponse(c, orders, 'Berhasil mengambil pesanan.');
});

export const getOrderByIdController = controller(async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) return errorResponse(c, 'Unauthorized', 401);

  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(c, 'ID pesanan tidak valid.', 400);
  }

  const order = await getOrderForUser(id, userId);
  if (!order) return errorResponse(c, 'Pesanan tidak ditemukan.', 404);

  return successResponse(c, order, 'Berhasil mengambil pesanan.');
});

export const midtransNotificationController = controller(async (c: Context) => {
  const payload = await c.req.json<Record<string, unknown>>();

  const result = await handleMidtransNotification(payload);

  return successResponse(
    c,
    result,
    'Notifikasi Midtrans diterima. Implementasi lanjutan masih TODO.',
  );
});
