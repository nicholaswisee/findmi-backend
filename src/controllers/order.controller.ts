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
  getOrderWithUserById,
  exportOrdersToCsv,
} from '../services/order.service';
import {
  getManualPaymentSummary,
  listManualPaymentProofs,
  reviewManualPaymentProof,
  submitManualPaymentProof,
  resolveManualQrisUrl,
} from '../services/manualPayment.service';
import type { UserDepartmentEnum } from '../schemas';
import type { IncomingUploadFile } from '../services/upload.service';
import { getUser } from '../utils/user';

const isFileLike = (value: unknown): value is IncomingUploadFile =>
  typeof value === 'object' &&
  value !== null &&
  'arrayBuffer' in value &&
  typeof (value as IncomingUploadFile).arrayBuffer === 'function';

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
    fulfillmentMethod?: 'OTS' | 'Delivery';
    paymentMethod?: 'Manual' | 'Midtrans';
    deliveryDetails?: {
      contactName?: string;
      phone?: string;
      address?: string;
      notes?: string | null;
    };
  }>();

  const result = await createOrder(userId, {
    items: body.items,
    fulfillmentMethod: body.fulfillmentMethod ?? 'OTS',
    deliveryDetails: body.deliveryDetails,
    paymentMethod: body.paymentMethod,
  });

  if (result.payment?.provider === 'Manual') {
    const metadata = result.payment.metadata ?? {};
    if (metadata.qrisImageUrl) {
      metadata.qrisImageUrl = resolveManualQrisUrl(
        metadata.qrisImageUrl as string,
        c.req.url,
        {
          origin: c.req.header('origin'),
          host: c.req.header('host'),
          forwardedProto: c.req.header('x-forwarded-proto'),
        },
      );
    }
    result.payment.metadata = metadata;
  }

  return successResponse(
    c,
    result,
    'Pesanan berhasil dibuat. Lanjutkan proses pembayaran.',
    201,
  );
});

export const createManualOrderController = controller(async (c: Context) => {
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
    fulfillmentMethod?: 'OTS' | 'Delivery';
    deliveryDetails?: {
      contactName?: string;
      phone?: string;
      address?: string;
      notes?: string | null;
    };
  }>();

  const result = await createOrder(userId, {
    items: body.items,
    fulfillmentMethod: body.fulfillmentMethod ?? 'OTS',
    deliveryDetails: body.deliveryDetails,
    paymentMethod: 'Manual',
  });

  if (result.payment?.provider === 'Manual') {
    const metadata = result.payment.metadata ?? {};
    if (metadata.qrisImageUrl) {
      metadata.qrisImageUrl = resolveManualQrisUrl(
        metadata.qrisImageUrl as string,
        c.req.url,
        {
          origin: c.req.header('origin'),
          host: c.req.header('host'),
          forwardedProto: c.req.header('x-forwarded-proto'),
        },
      );
    }
    result.payment.metadata = metadata;
  }

  return successResponse(
    c,
    result,
    'Pesanan manual berhasil dibuat. Scan QRIS dan unggah bukti pembayaran.',
    201,
  );
});

export const createManualOrderWithProofController = controller(
  async (c: Context) => {
    const userId = getUserId(c);
    if (!userId) return errorResponse(c, 'Tidak memiliki akses.', 401);

    const formData = await c.req.parseBody();
    const maybeFile = formData.file;
    if (!isFileLike(maybeFile)) {
      return errorResponse(
        c,
        'Form-data harus menyertakan field file untuk bukti pembayaran.',
        400,
      );
    }

    const rawItems = formData.items;
    if (typeof rawItems !== 'string' || !rawItems.trim()) {
      return errorResponse(c, 'Field items wajib diisi.', 400);
    }

    let items: Array<{
      productId?: number;
      bundleId?: number;
      quantity: number;
      size?: string | null;
      bundleSelections?: Array<{ productId: number; size?: string | null }>;
    }>;

    try {
      const parsed = JSON.parse(rawItems);
      if (!Array.isArray(parsed)) {
        throw new Error('items harus berupa array.');
      }
      items = parsed;
    } catch (err) {
      return errorResponse(
        c,
        err instanceof Error ? err.message : 'Field items tidak valid.',
        400,
      );
    }

    let deliveryDetails:
      | {
          contactName?: string;
          phone?: string;
          address?: string;
          notes?: string | null;
        }
      | undefined;

    const rawDelivery = formData.deliveryDetails;
    if (typeof rawDelivery === 'string' && rawDelivery.trim()) {
      try {
        const parsed = JSON.parse(rawDelivery);
        if (parsed && typeof parsed === 'object') {
          deliveryDetails = parsed;
        }
      } catch (err) {
        return errorResponse(
          c,
          err instanceof Error
            ? `Field deliveryDetails tidak valid: ${err.message}`
            : 'Field deliveryDetails tidak valid.',
          400,
        );
      }
    }

    const fulfillmentMethod =
      formData.fulfillmentMethod === 'Delivery' ||
      formData.fulfillmentMethod === 'OTS'
        ? formData.fulfillmentMethod
        : undefined;

    const result = await createOrder(
      userId,
      {
        items,
        fulfillmentMethod: fulfillmentMethod ?? 'OTS',
        deliveryDetails,
        paymentMethod: 'Manual',
      },
      {
        manualProofFile: maybeFile,
        requestContext: {
          requestUrl: c.req.url,
          headers: {
            origin: c.req.header('origin'),
            host: c.req.header('host'),
            forwardedProto: c.req.header('x-forwarded-proto'),
          },
        },
      },
    );

    if (result.payment?.provider === 'Manual') {
      const metadata = result.payment.metadata ?? {};
      if (metadata.qrisImageUrl) {
        metadata.qrisImageUrl = resolveManualQrisUrl(
          metadata.qrisImageUrl as string,
          c.req.url,
          {
            origin: c.req.header('origin'),
            host: c.req.header('host'),
            forwardedProto: c.req.header('x-forwarded-proto'),
          },
        );
      }
      result.payment.metadata = metadata;
    }

    return successResponse(
      c,
      result,
      'Pesanan manual dibuat dan bukti pembayaran dikirim.',
      201,
    );
  },
);

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

export const exportOrdersCsvController = controller(async (c: Context) => {
  const search = c.req.query('search');
  const departmentParam = c.req.query('department');
  const pickupParam = c.req.query('pickup');

  const pickupFilter =
    pickupParam === 'taken' || pickupParam === 'pending'
      ? pickupParam
      : undefined;

  const csv = await exportOrdersToCsv({
    search: search?.trim(),
    department: departmentParam as UserDepartmentEnum | undefined,
    pickup: pickupFilter,
  });

  const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});

export const getAdminOrderByIdController = controller(async (c: Context) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(c, 'ID pesanan tidak valid.', 400);
  }

  const order = await getOrderWithUserById(id);
  if (!order) {
    return errorResponse(c, 'Pesanan tidak ditemukan.', 404);
  }

  return successResponse(c, order, 'Berhasil mengambil pesanan.');
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

export const uploadManualPaymentProofController = controller(
  async (c: Context) => {
    const userId = getUserId(c);
    if (!userId) return errorResponse(c, 'Tidak memiliki akses.', 401);

    const orderId = Number(c.req.param('id'));
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return errorResponse(c, 'ID pesanan tidak valid.', 400);
    }

    const formData = await c.req.parseBody();
    const maybeFile = formData.file;
    if (!isFileLike(maybeFile)) {
      return errorResponse(
        c,
        'Form-data harus menyertakan field file untuk bukti pembayaran.',
        400,
      );
    }

    const result = await submitManualPaymentProof({
      orderId,
      userId,
      file: maybeFile,
      requestUrl: c.req.url,
      headers: {
        origin: c.req.header('origin'),
        host: c.req.header('host'),
        forwardedProto: c.req.header('x-forwarded-proto'),
      },
    });

    return successResponse(
      c,
      {
        proof: result.proof,
        order_id: orderId,
        payment_status: result.order.payment_status,
      },
      'Bukti pembayaran berhasil dikirim.',
    );
  },
);

export const getManualPaymentSummaryController = controller(
  async (c: Context) => {
    const user = getUser(c);
    if (!user) return errorResponse(c, 'Tidak memiliki akses.', 401);

    const orderId = Number(c.req.param('id'));
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return errorResponse(c, 'ID pesanan tidak valid.', 400);
    }

    const summary = await getManualPaymentSummary(
      orderId,
      {
        userId: user.userId,
        isAdmin: user.role === 'admin',
      },
      {
        requestUrl: c.req.url,
        headers: {
          origin: c.req.header('origin'),
          host: c.req.header('host'),
          forwardedProto: c.req.header('x-forwarded-proto'),
        },
      },
    );

    return successResponse(
      c,
      summary,
      'Informasi pembayaran manual berhasil diambil.',
    );
  },
);

export const listManualPaymentProofsController = controller(
  async (c: Context) => {
    const status = c.req.query('status');
    const search = c.req.query('search');
    const limit = c.req.query('limit');
    const offset = c.req.query('offset');

    const result = await listManualPaymentProofs({
      status:
        status === 'Pending' || status === 'Approved' || status === 'Rejected'
          ? status
          : undefined,
      search: search?.trim(),
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });

    return successResponse(
      c,
      result,
      'Daftar bukti pembayaran manual berhasil diambil.',
    );
  },
);

export const reviewManualPaymentProofController = controller(
  async (c: Context) => {
    const proofId = Number(c.req.param('id'));
    if (!Number.isInteger(proofId) || proofId <= 0) {
      return errorResponse(c, 'ID bukti pembayaran tidak valid.', 400);
    }

    const body = await c.req.json<{
      decision?: 'approve' | 'reject';
      note?: string | null;
    }>();

    if (body.decision !== 'approve' && body.decision !== 'reject') {
      return errorResponse(
        c,
        'Keputusan review harus approve atau reject.',
        400,
      );
    }

    const reviewerId = getUserId(c);
    if (!reviewerId) {
      return errorResponse(c, 'Tidak memiliki akses.', 401);
    }

    const updated = await reviewManualPaymentProof({
      proofId,
      reviewerId,
      decision: body.decision,
      note: body.note,
    });

    return successResponse(c, updated, 'Status pembayaran manual diperbarui.');
  },
);
