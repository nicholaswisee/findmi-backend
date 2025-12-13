import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db, schema } from '../db/db';
import type { OrderFulfillmentMethod } from '../db/schema';
import type { UserDepartmentEnum } from '../schemas';
import {
  normalizeBundleSelections,
  type BundleSelectionInput,
  type BundleSelectionRecord,
} from './bundleSelection';
import { getMidtransSnap } from './midtrans';
import { buildManualPaymentInitiation } from './manualPayment.service';
import crypto from 'crypto';
import { assertManualPaymentConfig } from '../constants/manualPayment';
import { storeImageFile, type StoredImage } from './mediaStorage.service';
import type { IncomingUploadFile } from './upload.service';

type OrderRow = InferSelectModel<typeof schema.ordersTable>;
type OrderItemRow = InferSelectModel<typeof schema.orderItemsTable>;
type ProductRow = InferSelectModel<typeof schema.productsTable>;
type BundleRow = InferSelectModel<typeof schema.bundlesTable>;
type UserRow = InferSelectModel<typeof schema.usersTable>;
type ManualPaymentProofRow = InferSelectModel<
  typeof schema.manualPaymentProofsTable
>;

export type CreateOrderItemInput = {
  productId?: number;
  bundleId?: number;
  quantity: number;
  size?: string | null;
  option?: string | null;
  bundleSelections?: BundleSelectionInput[];
};

export type DeliveryDetailsInput = {
  contactName: string;
  phone: string;
  address: string;
  notes?: string | null;
};

export type CreateOrderPayload = {
  items: CreateOrderItemInput[];
  fulfillmentMethod: OrderFulfillmentMethod;
  deliveryDetails?: DeliveryDetailsInput | null;
  paymentMethod?: OrderPaymentMethod;
};

type OrderItemWithDetails = OrderItemRow & {
  product: ProductRow | null;
  bundle: BundleRow | null;
};

export type OrderWithItems = OrderRow & {
  items: OrderItemWithDetails[];
};

export type OrderWithUser = OrderWithItems & {
  user: UserRow;
};

type OrderPaymentMethod = 'Manual' | 'Midtrans';
type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';
type RequestContext = {
  requestUrl?: string;
  headers?: {
    origin?: string | null;
    host?: string | null;
    forwardedProto?: string | null;
  };
};

const SIZE_SURCHARGE = 15000;

const isAboveXL = (size: string | null | undefined) => {
  const normalized = size?.trim().toUpperCase();
  if (!normalized || !normalized.endsWith('L')) return false;

  const numericMatch = normalized.match(/^(\d+)XL$/);
  if (numericMatch) {
    return Number(numericMatch[1]) >= 2;
  }

  const xMatch = normalized.match(/^(X+)L$/);
  if (xMatch?.[1]) {
    return xMatch[1].length >= 2;
  }

  return false;
};

const configuredDeliveryFee = Number(process.env.DELIVERY_FEE);
const DELIVERY_FEE =
  Number.isFinite(configuredDeliveryFee) && configuredDeliveryFee >= 0
    ? Number(configuredDeliveryFee)
    : 20000;

function resolveFulfillmentMethod(
  value?: OrderFulfillmentMethod,
): OrderFulfillmentMethod {
  if (value === 'Delivery' || value === 'OTS') {
    return value;
  }
  return 'OTS';
}

function resolvePaymentMethod(value?: OrderPaymentMethod): OrderPaymentMethod {
  if (value === 'Manual') return 'Manual';
  return 'Midtrans';
}

function calculateDeliveryFee(method: OrderFulfillmentMethod): number {
  return method === 'Delivery' ? DELIVERY_FEE : 0;
}

function normalizeDeliveryDetails(
  method: OrderFulfillmentMethod,
  details?: DeliveryDetailsInput | null,
): {
  contactName: string;
  phone: string;
  address: string;
  notes: string;
} {
  if (method !== 'Delivery') {
    return {
      contactName: '',
      phone: '',
      address: '',
      notes: '',
    };
  }

  if (!details) {
    throw new Error('Informasi pengiriman wajib diisi untuk pesanan Delivery.');
  }

  const contactName = details.contactName?.trim();
  const phone = details.phone?.trim();
  const address = details.address?.trim();
  const notes = details.notes?.trim() ?? '';

  if (!contactName) {
    throw new Error('Nama penerima pengiriman wajib diisi.');
  }
  if (!phone) {
    throw new Error('Nomor telepon pengiriman wajib diisi.');
  }
  if (!address) {
    throw new Error('Alamat pengiriman wajib diisi.');
  }

  if (contactName.length > 255) {
    throw new Error('Nama penerima maksimal 255 karakter.');
  }
  if (phone.length > 64) {
    throw new Error('Nomor telepon maksimal 64 karakter.');
  }

  return {
    contactName,
    phone,
    address,
    notes,
  };
}

type OrderCustomer = {
  name: string;
  phone?: string | null;
  email?: string | null;
};

async function getOrderCustomer(userId: number): Promise<OrderCustomer> {
  const [user] = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.id, userId));

  if (!user) {
    throw new Error('Pengguna tidak ditemukan.');
  }

  const [account] = await db
    .select({ email: schema.accountsTable.email })
    .from(schema.accountsTable)
    .where(eq(schema.accountsTable.user_id, userId));

  return {
    name: user.name,
    phone: user.no_wa,
    email: account?.email ?? null,
  };
}

function buildMidtransItems(order: OrderWithItems) {
  const items = order.items.map((item) => ({
    id: item.product_id
      ? `product-${item.product_id}`
      : `bundle-${item.bundle_id ?? 'unknown'}`,
    price: Math.round(item.unit_price),
    quantity: item.quantity,
    name: (item.product?.name ?? item.bundle?.name ?? 'Item').slice(0, 50),
    brand: 'FindMi2026',
    category: item.product?.category ?? item.bundle?.category ?? 'General',
    merchant_name: 'FindMi2026',
  }));

  if (order.delivery_fee > 0) {
    items.push({
      id: 'delivery-fee',
      price: Math.round(order.delivery_fee),
      quantity: 1,
      name: 'Biaya Pengiriman',
      brand: 'FindMi2026',
      category: 'Delivery',
      merchant_name: 'FindMi2026',
    });
  }

  return items;
}

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
    if (
      item.bundleSelections &&
      item.bundleSelections.some(
        (selection) => typeof selection?.productId !== 'number',
      )
    ) {
      throw new Error('Pilihan ukuran bundle tidak valid.');
    }
  }
}

async function clearUserCartItems(userId: number) {
  const [cart] = await db
    .select()
    .from(schema.cartsTable)
    .where(eq(schema.cartsTable.user_id, userId));

  if (!cart) return;

  await db
    .delete(schema.cartItemsTable)
    .where(eq(schema.cartItemsTable.cart_id, cart.id));
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

export async function buildOrderWithItems(
  order: OrderRow,
): Promise<OrderWithItems> {
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

async function fetchUsersMap(ids: number[]): Promise<Map<number, UserRow>> {
  if (ids.length === 0) return new Map();
  const uniqueIds = Array.from(new Set(ids));

  const users = await db
    .select()
    .from(schema.usersTable)
    .where(inArray(schema.usersTable.id, uniqueIds));

  return new Map(users.map((user) => [user.id, user]));
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

export type OrderListFilters = {
  limit?: number;
  offset?: number;
  search?: string;
  department?: UserDepartmentEnum;
  pickup?: 'taken' | 'pending';
};

function buildOrderWhereClause({
  search,
  department,
  pickup,
}: OrderListFilters) {
  const filters = [];

  if (department) {
    filters.push(eq(schema.usersTable.department, department));
  }

  if (pickup === 'taken') {
    filters.push(eq(schema.ordersTable.is_taken, true));
  } else if (pickup === 'pending') {
    filters.push(eq(schema.ordersTable.is_taken, false));
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    const likeValue = `%${trimmedSearch}%`;
    filters.push(
      or(
        ilike(schema.usersTable.name, likeValue),
        ilike(schema.usersTable.nim, likeValue),
        ilike(schema.ordersTable.transaction_id, likeValue),
      ),
    );
  }

  if (filters.length === 0) {
    return undefined;
  }

  return and(...filters);
}

export type OrdersWithUsersResult = {
  orders: OrderWithUser[];
  total: number;
  limit: number;
  offset: number;
};

export async function getAllOrders({
  limit = 50,
  offset = 0,
  search,
  department,
  pickup,
}: OrderListFilters = {}): Promise<OrdersWithUsersResult> {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const safeOffset = Math.max(0, offset);
  const whereClause = buildOrderWhereClause({
    search,
    department,
    pickup,
  });

  const baseQuery = db
    .select({
      order: schema.ordersTable,
      user: schema.usersTable,
    })
    .from(schema.ordersTable)
    .innerJoin(
      schema.usersTable,
      eq(schema.usersTable.id, schema.ordersTable.user_id),
    )
    .orderBy(desc(schema.ordersTable.created_at))
    .limit(safeLimit)
    .offset(safeOffset);

  const totalQuery = db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(schema.ordersTable)
    .innerJoin(
      schema.usersTable,
      eq(schema.usersTable.id, schema.ordersTable.user_id),
    );

  const [rows, totalRows] = await Promise.all([
    whereClause ? baseQuery.where(whereClause) : baseQuery,
    whereClause ? totalQuery.where(whereClause) : totalQuery,
  ]);

  const ordersWithItems = await Promise.all(
    rows.map((row) => buildOrderWithItems(row.order)),
  );

  const orders = ordersWithItems.map((order, index) => {
    const user = rows[index]?.user;
    if (!user) {
      throw new Error('Pengguna untuk pesanan tidak ditemukan.');
    }
    return {
      ...order,
      user,
    };
  });

  return {
    orders,
    total: Number(totalRows[0]?.count ?? 0),
    limit: safeLimit,
    offset: safeOffset,
  };
}

export async function getOrderWithUserById(
  orderId: number,
): Promise<OrderWithUser | null> {
  const [row] = await db
    .select({
      order: schema.ordersTable,
      user: schema.usersTable,
    })
    .from(schema.ordersTable)
    .innerJoin(
      schema.usersTable,
      eq(schema.usersTable.id, schema.ordersTable.user_id),
    )
    .where(eq(schema.ordersTable.id, orderId))
    .limit(1);

  if (!row) {
    return null;
  }

  const orderWithItems = await buildOrderWithItems(row.order);
  return {
    ...orderWithItems,
    user: row.user,
  };
}

export async function createOrder(
  userId: number,
  payload: CreateOrderPayload,
  options?: {
    manualProofFile?: IncomingUploadFile;
    requestContext?: RequestContext;
  },
): Promise<{
  order: OrderWithItems;
  payment:
    | {
        provider: 'Midtrans';
        transactionId?: string;
        transactionToken?: string;
        status?: string;
        checkoutUrl?: string;
        checkoutPath?: string;
        expiresAt?: string;
        instructions?: string;
      }
    | {
        provider: 'Manual';
        transactionId?: string;
        status?: string;
        expiresAt?: string;
        instructions?: string;
        metadata?: Record<string, unknown>;
      }
    | null;
}> {
  assertValidItems(payload.items);
  const fulfillmentMethod = resolveFulfillmentMethod(payload.fulfillmentMethod);
  const paymentMethod: OrderPaymentMethod = options?.manualProofFile
    ? 'Manual'
    : resolvePaymentMethod(payload.paymentMethod);
  const deliveryFee = calculateDeliveryFee(fulfillmentMethod);
  const deliveryDetails = normalizeDeliveryDetails(
    fulfillmentMethod,
    payload.deliveryDetails,
  );

  const bundleIds = payload.items
    .map((item) => item.bundleId ?? undefined)
    .filter((id): id is number => typeof id === 'number');

  const bundlesMap = await fetchBundlesMap(bundleIds);

  const productIdSet = new Set<number>(
    payload.items
      .map((item) => item.productId ?? undefined)
      .filter((id): id is number => typeof id === 'number'),
  );

  for (const bundle of bundlesMap.values()) {
    const bundleItems = Array.isArray(bundle.bundle_items)
      ? (bundle.bundle_items as Array<{ product_id: number }>)
      : [];
    for (const bundleItem of bundleItems) {
      productIdSet.add(bundleItem.product_id);
    }
  }

  const productsMap = await fetchProductsMap(Array.from(productIdSet));

  const orderItems: Array<{
    product_id: number | null;
    bundle_id: number | null;
    quantity: number;
    unit_price: number;
    selected_size: string | null;
    selected_option: string | null;
    selected_bundle_items: BundleSelectionRecord[];
  }> = payload.items.map((item) => {
    if (item.productId) {
      const product = productsMap.get(item.productId);
      if (!product) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
      }
      const availableSizes = Array.isArray(product.available_sizes)
        ? product.available_sizes
        : [];
      const availableOptions = Array.isArray(product.options)
        ? product.options
        : [];
      const trimmedSize = typeof item.size === 'string' ? item.size.trim() : '';
      const trimmedOption =
        typeof item.option === 'string' ? item.option.trim() : '';
      let selectedSize: string | null = null;
      let selectedOption: string | null = null;
      if (availableSizes.length > 0) {
        const normalizedInput = trimmedSize.toUpperCase();
        if (!normalizedInput) {
          throw new Error(
            `Pilih ukuran untuk produk ${product.name ?? product.id}.`,
          );
        }
        const matchedSize = availableSizes.find(
          (option) => option.toUpperCase() === normalizedInput,
        );
        if (!matchedSize) {
          throw new Error(
            `Ukuran ${item.size} tidak tersedia untuk produk ${
              product.name ?? product.id
            }.`,
          );
        }
        selectedSize = matchedSize;
      }
      if (trimmedOption) {
        const matchedOption = availableOptions.find(
          (opt) => opt?.label?.toUpperCase() === trimmedOption.toUpperCase(),
        );
        if (!matchedOption) {
          throw new Error(
            `Opsi ${item.option} tidak tersedia untuk produk ${
              product.name ?? product.id
            }.`,
          );
        }
        selectedOption = matchedOption.label;
      }
      const optionPrice =
        selectedOption && availableOptions.length > 0
          ? (availableOptions.find(
              (opt) =>
                opt?.label?.toUpperCase() === selectedOption.toUpperCase(),
            )?.additional_price ?? 0)
          : 0;
      const sizePrice =
        selectedSize && isAboveXL(selectedSize) ? SIZE_SURCHARGE : 0;
      return {
        product_id: product.id,
        bundle_id: null,
        quantity: item.quantity,
        unit_price: Number(product.price) + sizePrice + optionPrice,
        selected_size: selectedSize,
        selected_option: selectedOption,
        selected_bundle_items: [],
      };
    }

    if (item.bundleId) {
      const bundle = bundlesMap.get(item.bundleId);
      if (!bundle) {
        throw new Error(`Bundle dengan ID ${item.bundleId} tidak ditemukan.`);
      }
      const normalizedSelections = normalizeBundleSelections({
        bundle,
        productsMap,
        selections: item.bundleSelections,
      });
      return {
        product_id: null,
        bundle_id: bundle.id,
        quantity: item.quantity,
        unit_price: Number(bundle.price),
        selected_size: null,
        selected_option: null,
        selected_bundle_items: normalizedSelections,
      };
    }

    throw new Error('Item pesanan tidak valid.');
  });

  const itemsTotal = orderItems.reduce(
    (acc, item) => acc + item.unit_price * item.quantity,
    0,
  );
  const totalAmount = itemsTotal + deliveryFee;

  let storedProof: StoredImage | null = null;
  let createdProof: ManualPaymentProofRow | null = null;
  let manualTransactionId: string | null = null;

  if (options?.manualProofFile) {
    const config = assertManualPaymentConfig();
    storedProof = await storeImageFile(options.manualProofFile, {
      folder: config.uploadFolder,
      requestUrl: options.requestContext?.requestUrl,
      headers: options.requestContext?.headers,
      requireCloudinary: true,
    });
  }

  let createdOrder: OrderRow | null = null;

  await db.transaction(async (trx) => {
    const [order] = await trx
      .insert(schema.ordersTable)
      .values({
        user_id: userId,
        total_amount: totalAmount,
        payment_status: 'Pending',
        payment_method: paymentMethod,
        fulfillment_method: fulfillmentMethod,
        delivery_fee: deliveryFee,
        delivery_contact_name: deliveryDetails.contactName,
        delivery_phone: deliveryDetails.phone,
        delivery_address: deliveryDetails.address,
        delivery_notes: deliveryDetails.notes,
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

    if (storedProof) {
      const now = new Date();
      const [proof] = await trx
        .insert(schema.manualPaymentProofsTable)
        .values({
          order_id: order.id,
          user_id: userId,
          image_url: storedProof.url,
          storage_provider: storedProof.provider,
          storage_key: storedProof.publicId ?? storedProof.path ?? null,
          status: 'Pending',
          reviewer_id: null,
          reviewer_note: null,
          reviewed_at: null,
          created_at: now,
          updated_at: now,
        })
        .returning();

      manualTransactionId = storedProof.publicId?.trim()
        ? `manual-${storedProof.publicId}`
        : proof
          ? `manual-proof-${proof.id}`
          : `manual-proof-${order.id}`;

      await trx
        .update(schema.ordersTable)
        .set({
          transaction_id: manualTransactionId,
          payment_method: 'Manual',
          updated_at: now,
        })
        .where(eq(schema.ordersTable.id, order.id));

      createdProof = proof ?? null;
      createdOrder = {
        ...order,
        transaction_id: manualTransactionId,
        payment_method: 'Manual',
        updated_at: now,
      };
    }
  });

  if (!createdOrder) {
    throw new Error('Pesanan tidak berhasil dibuat.');
  }

  await clearUserCartItems(userId);
  const customer = await getOrderCustomer(userId);

  const orderWithItems = await buildOrderWithItems(createdOrder);

  const payment =
    paymentMethod === 'Manual'
      ? buildManualPaymentInitiation(orderWithItems)
      : await initiateMidtransTransaction(orderWithItems, customer);

  return {
    order: orderWithItems,
    payment,
  };
}

export async function initiateMidtransTransaction(
  order: OrderWithItems,
  customer: OrderCustomer,
): Promise<{
  provider: 'Midtrans';
  transactionId?: string;
  transactionToken?: string;
  status?: string;
  checkoutUrl?: string;
  checkoutPath?: string;
  expiresAt?: string;
  instructions?: string;
} | null> {
  const snap = getMidtransSnap();
  const orderCode = `AMI-${order.id}-${Date.now()}`;
  const grossAmount = Math.max(1, Math.round(order.total_amount));
  const items = buildMidtransItems(order);

  const [firstName, ...restName] = (customer.name || 'Pengguna').split(' ');
  const lastName = restName.join(' ');

  const phoneNumber =
    order.delivery_phone?.trim() || customer.phone?.trim() || undefined;

  let transaction;
  try {
    transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderCode,
        gross_amount: grossAmount,
      },
      credit_card: {
        secure: true,
      },
      item_details: items,
      customer_details: {
        first_name: firstName || 'Pengguna',
        last_name: lastName,
        email: customer.email ?? 'no-reply@findmi.local',
        phone: phoneNumber,
        billing_address: {
          first_name: order.delivery_contact_name || customer.name,
          last_name: lastName,
          email: customer.email ?? 'no-reply@findmi.local',
          phone: phoneNumber,
          address: order.delivery_address || undefined,
        },
        shipping_address: {
          first_name: order.delivery_contact_name || customer.name,
          last_name: lastName,
          email: customer.email ?? 'no-reply@findmi.local',
          phone: phoneNumber,
          address: order.delivery_address || undefined,
        },
      },
    });
  } catch (err) {
    const message =
      Array.isArray((err as { error_messages?: unknown }).error_messages) &&
      (err as { error_messages: unknown[] }).error_messages.length > 0
        ? (err as { error_messages: unknown[] }).error_messages
            .map((m) => String(m))
            .join('; ')
        : (err as Error).message;
    throw new Error(`Midtrans Snap error: ${message}`);
  }

  await db
    .update(schema.ordersTable)
    .set({
      transaction_id: transaction.token,
      updated_at: new Date(),
    })
    .where(eq(schema.ordersTable.id, order.id));

  return {
    provider: 'Midtrans',
    transactionId: orderCode,
    transactionToken: transaction.token,
    status: 'PENDING',
    checkoutUrl: transaction.redirect_url,
    instructions:
      'Lanjutkan pembayaran melalui halaman Midtrans. Transaksi Anda akan kedaluwarsa sesuai pengaturan Midtrans.',
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

export async function updateOrderAdminFields(
  orderId: number,
  {
    admin_note,
    is_taken,
  }: {
    admin_note?: string | null;
    is_taken?: boolean;
  },
): Promise<OrderWithItems> {
  const updates: Partial<typeof schema.ordersTable.$inferInsert> = {};

  if (typeof admin_note !== 'undefined') {
    updates.admin_note = admin_note;
  }

  if (typeof is_taken !== 'undefined') {
    updates.is_taken = is_taken;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('Tidak ada data yang diperbarui.');
  }

  updates.updated_at = new Date();

  const [order] = await db
    .update(schema.ordersTable)
    .set(updates)
    .where(eq(schema.ordersTable.id, orderId))
    .returning();

  if (!order) {
    throw new Error('Pesanan tidak ditemukan.');
  }

  return buildOrderWithItems(order);
}

export async function handleMidtransNotification(
  payload: Record<string, unknown>,
): Promise<{
  received: boolean;
  message: string;
}> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi.');
  }

  const orderCode = String(payload.order_id ?? '');
  const statusCode = String(payload.status_code ?? '');
  const grossAmount = String(payload.gross_amount ?? '');
  const signature = String(payload.signature_key ?? '');
  const transactionStatus = String(
    payload.transaction_status ?? '',
  ).toLowerCase();
  const fraudStatus = String(payload.fraud_status ?? '').toLowerCase();
  const transactionId = String(payload.transaction_id ?? '');

  if (!orderCode || !statusCode || !grossAmount || !signature) {
    throw new Error('Notifikasi Midtrans tidak lengkap.');
  }

  const computedSignature = crypto
    .createHash('sha512')
    .update(orderCode + statusCode + grossAmount + serverKey)
    .digest('hex');

  if (computedSignature !== signature) {
    throw new Error('Signature Midtrans tidak valid.');
  }

  const match = /^AMI-(\d+)-/.exec(orderCode);
  const orderId = match ? Number(match[1]) : NaN;
  if (!Number.isInteger(orderId)) {
    throw new Error('order_id Midtrans tidak valid.');
  }

  const newStatus: PaymentStatus = (() => {
    if (transactionStatus === 'capture') {
      return fraudStatus === 'challenge' ? 'Pending' : 'Paid';
    }
    if (transactionStatus === 'settlement') return 'Paid';
    if (transactionStatus === 'pending') return 'Pending';
    if (
      transactionStatus === 'refund' ||
      transactionStatus === 'partial_refund'
    )
      return 'Refunded';
    if (
      transactionStatus === 'deny' ||
      transactionStatus === 'cancel' ||
      transactionStatus === 'expire' ||
      transactionStatus === 'failure'
    ) {
      return 'Failed';
    }
    return 'Pending';
  })();

  const [order] = await db
    .update(schema.ordersTable)
    .set({
      payment_status: newStatus,
      transaction_id: transactionId || orderCode,
      updated_at: new Date(),
    })
    .where(eq(schema.ordersTable.id, orderId))
    .returning();

  if (!order) {
    throw new Error('Pesanan tidak ditemukan untuk notifikasi Midtrans.');
  }

  return {
    received: true,
    message: `Status pembayaran diperbarui menjadi ${newStatus}.`,
  };
}
