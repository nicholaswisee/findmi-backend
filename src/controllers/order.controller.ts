import type { Context } from 'hono';
import { successResponse, errorResponse } from '../utils/response';
import { controller } from '../utils/controller';
import { getUserId } from '../utils/user';
import {
  createOrder,
  getOrderForUser,
  getOrdersForUser,
  handleMidtransNotification,
  getAllOrders,
  updateOrderAdminFields,
  markOrderPaid,
} from '../services/order.service';
import type { UserDepartmentEnum } from '../schemas';

export const createOrderController = controller(async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) return errorResponse(c, 'Tidak memiliki akses.', 401);

  const body = await c.req.json<{
    items: Array<{
      productId?: number;
      bundleId?: number;
      quantity: number;
      size?: string | null;
      bundleSelections?: Array<{ productId: number; size?: string | null }>;
    }>;
  }>();

  const result = await createOrder(userId, { items: body.items });

  return successResponse(
    c,
    result,
    'Pesanan berhasil dibuat. Lanjutkan proses pembayaran.',
    201,
  );
});

export const completeDummyPaymentController = controller(async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) return errorResponse(c, 'Tidak memiliki akses.', 401);

  const orderId = Number(c.req.param('id'));
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return errorResponse(c, 'ID pesanan tidak valid.', 400);
  }

  const existing = await getOrderForUser(orderId, userId);
  if (!existing) {
    return errorResponse(c, 'Pesanan tidak ditemukan.', 404);
  }

  const result = await markOrderPaid(orderId, {
    transactionId: existing.transaction_id ?? `dummy-${Date.now()}`,
  });

  return successResponse(c, result, 'Pembayaran dummy berhasil diproses.');
});

export const getMyOrdersController = controller(async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) return errorResponse(c, 'Tidak memiliki akses.', 401);

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
  if (!userId) return errorResponse(c, 'Tidak memiliki akses.', 401);

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

export const getAllOrdersController = controller(async (c: Context) => {
  const limit = c.req.query('limit');
  const offset = c.req.query('offset');
  const search = c.req.query('search');
  const departmentParam = c.req.query('department');
  const pickupParam = c.req.query('pickup');

  const pickupFilter =
    pickupParam === 'taken' || pickupParam === 'pending'
      ? pickupParam
      : undefined;

  const orders = await getAllOrders({
    limit: limit ? Number(limit) : 50,
    offset: offset ? Number(offset) : 0,
    search: search?.trim(),
    department: departmentParam as UserDepartmentEnum | undefined,
    pickup: pickupFilter,
  });

  return successResponse(c, orders, 'Berhasil mengambil semua pesanan.');
});

export const updateOrderAdminFieldsController = controller(
  async (c: Context) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse(c, 'ID pesanan tidak valid.', 400);
    }

    const body = await c.req.json<{
      admin_note?: string;
      is_taken?: boolean;
    }>();

    const hasAdminNote =
      typeof body.admin_note === 'string' || body.admin_note === null;
    const hasTaken = typeof body.is_taken === 'boolean';

    if (!hasAdminNote && !hasTaken) {
      return errorResponse(
        c,
        'Minimal pilih salah satu field untuk diperbarui.',
        400,
      );
    }

    let adminNote: string | null | undefined = undefined;
    if (hasAdminNote) {
      if (body.admin_note === null) {
        adminNote = null;
      } else if (typeof body.admin_note === 'string') {
        adminNote = body.admin_note.trim() || null;
      }
    }

    const updated = await updateOrderAdminFields(id, {
      admin_note: adminNote,
      is_taken: hasTaken ? body.is_taken : undefined,
    });

    return successResponse(
      c,
      updated,
      'Catatan admin dan status pengambilan pesanan diperbarui.',
    );
  },
);
