import { and, desc, eq, inArray } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db, schema } from '../db/db';

type OrderRow = InferSelectModel<typeof schema.ordersTable>;
type OrderItemRow = InferSelectModel<typeof schema.orderItemsTable>;
type ProductRow = InferSelectModel<typeof schema.productsTable>;
type BundleRow = InferSelectModel<typeof schema.bundlesTable>;

export type CreateOrderItemInput = {
  productId?: number;
  bundleId?: number;
  quantity: number;
};

export type CreateOrderPayload = {
  items: CreateOrderItemInput[];
};

type OrderItemWithDetails = OrderItemRow & {
  product: ProductRow | null;
  bundle: BundleRow | null;
};

export type OrderWithItems = OrderRow & {
  items: OrderItemWithDetails[];
};

function assertValidItems(items: CreateOrderItemInput[]) {
  if (items.length === 0) {
    throw new Error('Minimal satu item diperlukan untuk membuat pesanan.');
  }

  for (const item of items) {
    const isValidId =
      typeof item.productId === 'number' || typeof item.bundleId === 'number';
    if (!isValidId || (item.productId && item.bundleId)) {
      throw new Error(
        'Setiap item hanya boleh memiliki salah satu productId atau bundleId.',
      );
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Jumlah item harus berupa bilangan bulat positif.');
    }
  }
}

async function fetchProductsMap(
  ids: number[],
): Promise<Map<number, ProductRow>> {
  if (ids.length === 0) return new Map();
  const uniqueIds = Array.from(new Set(ids));

  const products = await db
    .select()
    .from(schema.productsTable)
    .where(inArray(schema.productsTable.id, uniqueIds));

  return new Map(products.map((product) => [product.id, product]));
}

async function fetchBundlesMap(ids: number[]): Promise<Map<number, BundleRow>> {
  if (ids.length === 0) return new Map();
  const uniqueIds = Array.from(new Set(ids));

  const bundles = await db
    .select()
    .from(schema.bundlesTable)
    .where(inArray(schema.bundlesTable.id, uniqueIds));

  return new Map(bundles.map((bundle) => [bundle.id, bundle]));
}

async function buildOrderWithItems(order: OrderRow): Promise<OrderWithItems> {
  const items = await db
    .select()
    .from(schema.orderItemsTable)
    .where(eq(schema.orderItemsTable.order_id, order.id));

  const productIds = items
    .map((item) => item.product_id ?? undefined)
    .filter((id): id is number => typeof id === 'number');
  const bundleIds = items
    .map((item) => item.bundle_id ?? undefined)
    .filter((id): id is number => typeof id === 'number');

  const [productsMap, bundlesMap] = await Promise.all([
    fetchProductsMap(productIds),
    fetchBundlesMap(bundleIds),
  ]);

  const detailedItems: OrderItemWithDetails[] = items.map((item) => ({
    ...item,
    product: item.product_id
      ? (productsMap.get(item.product_id) ?? null)
      : null,
    bundle: item.bundle_id ? (bundlesMap.get(item.bundle_id) ?? null) : null,
  }));

  return {
    ...order,
    items: detailedItems,
  };
}

export async function getOrderById(
  orderId: number,
): Promise<OrderWithItems | null> {
  const [order] = await db
    .select()
    .from(schema.ordersTable)
    .where(eq(schema.ordersTable.id, orderId));

  if (!order) return null;
  return buildOrderWithItems(order);
}

export async function getOrderForUser(
  orderId: number,
  userId: number,
): Promise<OrderWithItems | null> {
  const [order] = await db
    .select()
    .from(schema.ordersTable)
    .where(
      and(
        eq(schema.ordersTable.id, orderId),
        eq(schema.ordersTable.user_id, userId),
      ),
    );

  if (!order) return null;
  return buildOrderWithItems(order);
}

export async function getOrdersForUser(
  userId: number,
  {
    limit = 20,
    offset = 0,
  }: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<OrderWithItems[]> {
  const orders = await db
    .select()
    .from(schema.ordersTable)
    .where(eq(schema.ordersTable.user_id, userId))
    .orderBy(desc(schema.ordersTable.created_at))
    .limit(Math.max(1, limit))
    .offset(Math.max(0, offset));

  return Promise.all(orders.map((order) => buildOrderWithItems(order)));
}

export async function getAllOrders({
  limit = 50,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
} = {}): Promise<OrderWithItems[]> {
  const orders = await db
    .select()
    .from(schema.ordersTable)
    .orderBy(desc(schema.ordersTable.created_at))
    .limit(Math.max(1, limit))
    .offset(Math.max(0, offset));

  return Promise.all(orders.map((order) => buildOrderWithItems(order)));
}

export async function createOrder(
  userId: number,
  payload: CreateOrderPayload,
): Promise<{
  order: OrderWithItems;
  payment: {
    provider: 'Midtrans';
    transactionId?: string;
    transactionToken?: string;
    redirectUrl?: string;
    todo: string;
  } | null;
}> {
  assertValidItems(payload.items);

  const productIds = payload.items
    .map((item) => item.productId ?? undefined)
    .filter((id): id is number => typeof id === 'number');
  const bundleIds = payload.items
    .map((item) => item.bundleId ?? undefined)
    .filter((id): id is number => typeof id === 'number');

  const [productsMap, bundlesMap] = await Promise.all([
    fetchProductsMap(productIds),
    fetchBundlesMap(bundleIds),
  ]);

  const orderItems: Array<{
    product_id: number | null;
    bundle_id: number | null;
    quantity: number;
    unit_price: number;
  }> = payload.items.map((item) => {
    if (item.productId) {
      const product = productsMap.get(item.productId);
      if (!product) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
      }
      return {
        product_id: product.id,
        bundle_id: null,
        quantity: item.quantity,
        unit_price: Number(product.price),
      };
    }

    if (item.bundleId) {
      const bundle = bundlesMap.get(item.bundleId);
      if (!bundle) {
        throw new Error(`Bundle dengan ID ${item.bundleId} tidak ditemukan.`);
      }
      return {
        product_id: null,
        bundle_id: bundle.id,
        quantity: item.quantity,
        unit_price: Number(bundle.price),
      };
    }

    throw new Error('Item pesanan tidak valid.');
  });

  const totalAmount = orderItems.reduce(
    (acc, item) => acc + item.unit_price * item.quantity,
    0,
  );

  let createdOrder: OrderRow | null = null;

  await db.transaction(async (trx) => {
    const [order] = await trx
      .insert(schema.ordersTable)
      .values({
        user_id: userId,
        total_amount: totalAmount,
        payment_status: 'Pending',
        payment_method: 'Midtrans',
      })
      .returning();

    if (!order) {
      throw new Error('Gagal membuat pesanan baru.');
    }

    await trx.insert(schema.orderItemsTable).values(
      orderItems.map((item) => ({
        ...item,
        order_id: order.id,
      })),
    );

    createdOrder = order;
  });

  if (!createdOrder) {
    throw new Error('Pesanan tidak berhasil dibuat.');
  }

  const orderWithItems = await buildOrderWithItems(createdOrder);

  const payment = await initiateMidtransTransaction(orderWithItems);

  return {
    order: orderWithItems,
    payment,
  };
}

export async function initiateMidtransTransaction(
  _order: OrderWithItems,
): Promise<{
  provider: 'Midtrans';
  transactionId?: string;
  transactionToken?: string;
  redirectUrl?: string;
  todo: string;
} | null> {
  // TODO: Panggil Midtrans Snap API untuk membuat transaksi pembayaran.
  // TODO: Simpan transactionId / token yang diterima dari Midtrans.
  // TODO: Kembalikan data yang dibutuhkan frontend (misal redirectUrl atau snapToken).
  return {
    provider: 'Midtrans',
    todo: 'Integrasi Midtrans belum diimplementasikan.',
  };
}

export async function markOrderPaid(
  orderId: number,
  {
    transactionId,
  }: {
    transactionId?: string;
  },
): Promise<OrderWithItems> {
  const [order] = await db
    .update(schema.ordersTable)
    .set({
      payment_status: 'Paid',
      transaction_id: transactionId ?? null,
    })
    .where(eq(schema.ordersTable.id, orderId))
    .returning();

  if (!order) {
    throw new Error('Pesanan tidak ditemukan.');
  }

  return buildOrderWithItems(order);
}

export async function updateOrderStatus(
  orderId: number,
  status: 'Pending' | 'Paid' | 'Failed' | 'Refunded',
  transactionId?: string | null,
): Promise<OrderWithItems> {
  const [order] = await db
    .update(schema.ordersTable)
    .set({
      payment_status: status,
      transaction_id: transactionId ?? null,
    })
    .where(eq(schema.ordersTable.id, orderId))
    .returning();

  if (!order) {
    throw new Error('Pesanan tidak ditemukan.');
  }

  return buildOrderWithItems(order);
}

export async function handleMidtransNotification(
  _payload: Record<string, unknown>,
): Promise<{
  received: boolean;
  message: string;
}> {
  // TODO: Verifikasi tanda tangan notifikasi Midtrans (signature_key).
  // TODO: Update status pesanan berdasarkan notifikasi Midtrans.
  // TODO: Simpan log notifikasi untuk audit trail jika diperlukan.
  return {
    received: true,
    message: 'Notifikasi Midtrans diterima. Implementasi masih TODO.',
  };
}
