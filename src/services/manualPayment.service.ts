import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db, schema } from '../db/db';
import {
  DEFAULT_INSTRUCTIONS,
  assertManualPaymentConfig,
} from '../constants/manualPayment';
import type { IncomingUploadFile } from './upload.service';
import { storeImageFile } from './mediaStorage.service';

type OrderRow = InferSelectModel<typeof schema.ordersTable>;
type UserRow = InferSelectModel<typeof schema.usersTable>;
type ManualPaymentProofRow = InferSelectModel<
  typeof schema.manualPaymentProofsTable
>;

export type ManualPaymentSummary = {
  order_id: number;
  payment_method: OrderRow['payment_method'];
  payment_status: OrderRow['payment_status'];
  total_amount: string;
  qris_image_url: string;
  instructions: string;
  contact: string;
  expires_at: string | null;
  latest_proof: ManualPaymentProofRow | null;
};

export type ManualPaymentProofWithUser = ManualPaymentProofRow & {
  order: Pick<
    OrderRow,
    'id' | 'total_amount' | 'payment_status' | 'transaction_id' | 'created_at'
  >;
  user: Pick<UserRow, 'id' | 'name' | 'nim' | 'department'>;
};

function isManualPayment(order: OrderRow) {
  return order.payment_method === 'Manual';
}

function buildManualInstructions() {
  const config = assertManualPaymentConfig();
  return {
    config,
    expiresAt: null,
  };
}

function toAbsoluteUrl(
  value: string,
  requestUrl?: string,
  headers?: {
    origin?: string | null;
    host?: string | null;
    forwardedProto?: string | null;
  },
) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  const normalized = value.startsWith('/') ? value : `/${value}`;
  const headerOrigin = headers?.origin ?? null;
  const headerHost = headers?.host ?? null;
  const proto = headers?.forwardedProto || 'http';

  if (headerOrigin) {
    return `${headerOrigin.replace(/\/$/, '')}${normalized}`;
  }

  if (headerHost) {
    return `${proto}://${headerHost}${normalized}`;
  }

  if (requestUrl?.startsWith('http')) {
    try {
      const url = new URL(requestUrl);
      return `${url.origin}${normalized}`;
    } catch (err) {
      console.error('toAbsoluteUrl failed to parse requestUrl:', err);
    }
  }

  return normalized;
}

export function resolveManualQrisUrl(
  value: string,
  requestUrl?: string,
  headers?: {
    origin?: string | null;
    host?: string | null;
    forwardedProto?: string | null;
  },
) {
  return toAbsoluteUrl(value, requestUrl, headers);
}

export function buildManualPaymentInitiation(
  order: OrderRow,
  requestContext?: {
    requestUrl?: string;
    headers?: {
      origin?: string | null;
      host?: string | null;
      forwardedProto?: string | null;
    };
  },
) {
  const { config, expiresAt } = buildManualInstructions();
  const status =
    order.payment_status === 'Paid'
      ? 'PAID'
      : order.payment_status === 'Failed'
        ? 'FAILED'
        : 'PENDING';
  return {
    provider: 'Manual' as const,
    status,
    transactionId: order.transaction_id ?? `manual-${order.id}`,
    expiresAt: expiresAt ?? undefined,
    instructions: DEFAULT_INSTRUCTIONS,
    metadata: {
      qrisImageUrl: toAbsoluteUrl(
        config.qrisImageUrl,
        requestContext?.requestUrl,
        requestContext?.headers,
      ),
      contact: '',
      requiresProofUpload: true,
    },
  };
}

async function getOrderForManualFlow(orderId: number) {
  const [order] = await db
    .select()
    .from(schema.ordersTable)
    .where(eq(schema.ordersTable.id, orderId));

  if (!order) {
    throw new Error('Pesanan tidak ditemukan.');
  }

  if (!isManualPayment(order)) {
    throw new Error('Pesanan ini tidak menggunakan pembayaran manual.');
  }

  return order;
}

export async function submitManualPaymentProof({
  orderId,
  userId,
  file,
  requestUrl,
  headers,
}: {
  orderId: number;
  userId: number;
  file: IncomingUploadFile;
  requestUrl?: string;
  headers?: {
    origin?: string | null;
    host?: string | null;
    forwardedProto?: string | null;
  };
}) {
  const order = await getOrderForManualFlow(orderId);
  if (order.user_id !== userId) {
    throw new Error(
      'Bukti pembayaran hanya dapat diunggah oleh pemilik pesanan.',
    );
  }

  if (order.payment_status === 'Paid') {
    throw new Error('Pesanan ini sudah ditandai lunas.');
  }

  const { config } = buildManualInstructions();
  const stored = await storeImageFile(file, {
    folder: config.uploadFolder,
    requestUrl,
    headers,
    requireCloudinary: true,
  });

  const now = new Date();

  const [proof] = await db.transaction(async (trx) => {
    await trx
      .update(schema.manualPaymentProofsTable)
      .set({
        status: 'Rejected',
        reviewer_note: 'Digantikan oleh unggahan terbaru.',
        reviewed_at: now,
        updated_at: now,
      })
      .where(
        and(
          eq(schema.manualPaymentProofsTable.order_id, order.id),
          eq(schema.manualPaymentProofsTable.status, 'Pending'),
        ),
      );

    const [inserted] = await trx
      .insert(schema.manualPaymentProofsTable)
      .values({
        order_id: order.id,
        user_id: userId,
        image_url: stored.url,
        storage_provider: stored.provider,
        storage_key: stored.publicId ?? stored.path ?? null,
        status: 'Pending',
        created_at: now,
        updated_at: now,
      })
      .returning();

    if (!inserted) {
      throw new Error('Gagal menyimpan bukti pembayaran.');
    }

    await trx
      .update(schema.ordersTable)
      .set({
        payment_status: 'Pending',
        payment_method: 'Manual',
        transaction_id: inserted.storage_key
          ? `manual-${inserted.storage_key}`
          : `manual-proof-${inserted.id}`,
        updated_at: now,
      })
      .where(eq(schema.ordersTable.id, order.id));

    return [inserted];
  });

  return {
    proof,
    order: {
      ...order,
      payment_status: 'Pending' as const,
    },
    publicUrl: stored.url,
  };
}

export async function getLatestManualPaymentProof(
  orderId: number,
): Promise<ManualPaymentProofRow | null> {
  const proof = await db
    .select()
    .from(schema.manualPaymentProofsTable)
    .where(eq(schema.manualPaymentProofsTable.order_id, orderId))
    .orderBy(desc(schema.manualPaymentProofsTable.created_at))
    .limit(1);

  return proof[0] ?? null;
}

export async function getManualPaymentSummary(
  orderId: number,
  viewer?: { userId?: number; isAdmin?: boolean },
  requestContext?: {
    requestUrl?: string;
    headers?: {
      origin?: string | null;
      host?: string | null;
      forwardedProto?: string | null;
    };
  },
): Promise<ManualPaymentSummary> {
  const order = await getOrderForManualFlow(orderId);
  if (!viewer?.isAdmin && viewer?.userId !== order.user_id) {
    throw new Error('Tidak memiliki akses ke pesanan ini.');
  }
  const { config, expiresAt } = buildManualInstructions();
  const latestProof = await getLatestManualPaymentProof(order.id);

  return {
    order_id: order.id,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    total_amount: String(order.total_amount),
    qris_image_url: toAbsoluteUrl(
      config.qrisImageUrl,
      requestContext?.requestUrl,
      requestContext?.headers,
    ),
    instructions: DEFAULT_INSTRUCTIONS,
    contact: '',
    expires_at: expiresAt,
    latest_proof: latestProof,
  };
}

export async function listManualPaymentProofs({
  status,
  limit = 20,
  offset = 0,
  search,
}: {
  status?: InferSelectModel<typeof schema.manualPaymentProofsTable>['status'];
  limit?: number;
  offset?: number;
  search?: string;
} = {}): Promise<{
  proofs: ManualPaymentProofWithUser[];
  total: number;
}> {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const safeOffset = Math.max(0, offset);
  const trimmedSearch = search?.trim();

  const whereClause = [];

  if (status) {
    whereClause.push(eq(schema.manualPaymentProofsTable.status, status));
  }

  if (trimmedSearch) {
    const value = `%${trimmedSearch}%`;
    whereClause.push(
      or(
        ilike(schema.usersTable.name, value),
        ilike(schema.usersTable.nim, value),
        ilike(schema.ordersTable.transaction_id, value),
      ),
    );
  }

  const baseQuery = db
    .select({
      proof: schema.manualPaymentProofsTable,
      order: {
        id: schema.ordersTable.id,
        total_amount: schema.ordersTable.total_amount,
        payment_status: schema.ordersTable.payment_status,
        transaction_id: schema.ordersTable.transaction_id,
        created_at: schema.ordersTable.created_at,
      },
      user: {
        id: schema.usersTable.id,
        name: schema.usersTable.name,
        nim: schema.usersTable.nim,
        department: schema.usersTable.department,
      },
    })
    .from(schema.manualPaymentProofsTable)
    .innerJoin(
      schema.ordersTable,
      eq(schema.ordersTable.id, schema.manualPaymentProofsTable.order_id),
    )
    .innerJoin(
      schema.usersTable,
      eq(schema.usersTable.id, schema.manualPaymentProofsTable.user_id),
    )
    .orderBy(desc(schema.manualPaymentProofsTable.created_at))
    .limit(safeLimit)
    .offset(safeOffset);

  const totalQuery = db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(schema.manualPaymentProofsTable)
    .innerJoin(
      schema.ordersTable,
      eq(schema.ordersTable.id, schema.manualPaymentProofsTable.order_id),
    )
    .innerJoin(
      schema.usersTable,
      eq(schema.usersTable.id, schema.manualPaymentProofsTable.user_id),
    );

  const [rows, totalRows] = await Promise.all([
    whereClause.length > 0 ? baseQuery.where(and(...whereClause)) : baseQuery,
    whereClause.length > 0 ? totalQuery.where(and(...whereClause)) : totalQuery,
  ]);

  const proofs = rows.map((row) => ({
    ...row.proof,
    order: row.order,
    user: row.user,
  }));

  return {
    proofs,
    total: Number(totalRows[0]?.count ?? 0),
  };
}

export async function reviewManualPaymentProof({
  proofId,
  reviewerId,
  decision,
  note,
}: {
  proofId: number;
  reviewerId: number;
  decision: 'approve' | 'reject';
  note?: string | null;
}): Promise<ManualPaymentProofRow> {
  const [row] = await db
    .select({
      proof: schema.manualPaymentProofsTable,
      order: schema.ordersTable,
    })
    .from(schema.manualPaymentProofsTable)
    .innerJoin(
      schema.ordersTable,
      eq(schema.ordersTable.id, schema.manualPaymentProofsTable.order_id),
    )
    .where(eq(schema.manualPaymentProofsTable.id, proofId))
    .limit(1);

  if (!row) {
    throw new Error('Bukti pembayaran tidak ditemukan.');
  }

  const proof = row.proof;
  const order = row.order;

  if (!isManualPayment(order)) {
    throw new Error('Pesanan ini bukan pembayaran manual.');
  }

  const now = new Date();
  const newProofStatus = decision === 'approve' ? 'Approved' : 'Rejected';
  const newPaymentStatus = decision === 'approve' ? 'Paid' : 'Failed';
  const reviewerNote = typeof note === 'string' ? note.trim() : null;

  const [updatedProof] = await db.transaction(async (trx) => {
    const [updated] = await trx
      .update(schema.manualPaymentProofsTable)
      .set({
        status: newProofStatus,
        reviewer_id: reviewerId,
        reviewer_note: reviewerNote,
        reviewed_at: now,
        updated_at: now,
      })
      .where(eq(schema.manualPaymentProofsTable.id, proofId))
      .returning();

    if (!updated) {
      throw new Error('Gagal memperbarui bukti pembayaran.');
    }

    await trx
      .update(schema.ordersTable)
      .set({
        payment_status: newPaymentStatus,
        payment_method: 'Manual',
        transaction_id: updated.storage_key
          ? `manual-${updated.storage_key}`
          : (order.transaction_id ?? `manual-proof-${updated.id}`),
        updated_at: now,
      })
      .where(eq(schema.ordersTable.id, order.id));

    if (decision === 'approve') {
      await trx
        .update(schema.manualPaymentProofsTable)
        .set({
          status: 'Rejected',
          reviewer_note: 'Pembayaran sudah disetujui menggunakan bukti lain.',
          reviewed_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(schema.manualPaymentProofsTable.order_id, order.id),
            eq(schema.manualPaymentProofsTable.status, 'Pending'),
            sql`${schema.manualPaymentProofsTable.id} <> ${proofId}`,
          ),
        );
    }

    return [updated];
  });

  return updatedProof;
}
