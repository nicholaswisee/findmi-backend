import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db, schema } from '../db/db';
import {
  normalizeBundleSelections,
  type BundleSelectionInput,
  type BundleSelectionRecord,
} from './bundleSelection';

type CartRow = InferSelectModel<typeof schema.cartsTable>;
type CartItemRow = InferSelectModel<typeof schema.cartItemsTable>;
type ProductRow = InferSelectModel<typeof schema.productsTable>;
type BundleRow = InferSelectModel<typeof schema.bundlesTable>;

type CartItemWithDetails = CartItemRow & {
  product: ProductRow | null;
  bundle: BundleRow | null;
  unit_price: number;
  line_total: number;
};

export type CartWithItems = CartRow & {
  items: CartItemWithDetails[];
  summary: {
    total_quantity: number;
    total_amount: number;
  };
};

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

async function ensureCart(userId: number): Promise<CartRow> {
  const [existingCart] = await db
    .select()
    .from(schema.cartsTable)
    .where(eq(schema.cartsTable.user_id, userId));

  if (existingCart) return existingCart;

  const [createdCart] = await db
    .insert(schema.cartsTable)
    .values({ user_id: userId })
    .returning();

  if (!createdCart) {
    throw new Error('Gagal membuat keranjang untuk pengguna.');
  }

  return createdCart;
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

async function buildCartResponse(userId: number): Promise<CartWithItems> {
  const cart = await ensureCart(userId);

  const cartItems = await db
    .select()
    .from(schema.cartItemsTable)
    .where(eq(schema.cartItemsTable.cart_id, cart.id));

  const productIds = cartItems
    .map((item) => item.product_id ?? undefined)
    .filter((id): id is number => typeof id === 'number');

  const bundleIds = cartItems
    .map((item) => item.bundle_id ?? undefined)
    .filter((id): id is number => typeof id === 'number');

  const [productsMap, bundlesMap] = await Promise.all([
    fetchProductsMap(productIds),
    fetchBundlesMap(bundleIds),
  ]);

  const items: CartItemWithDetails[] = cartItems.map((item) => {
    const product = item.product_id
      ? (productsMap.get(item.product_id) ?? null)
      : null;
    const bundle = item.bundle_id
      ? (bundlesMap.get(item.bundle_id) ?? null)
      : null;

    const unitPrice = product?.price ?? bundle?.price ?? 0;
    const lineTotal = unitPrice * item.quantity;

    return {
      ...item,
      product,
      bundle,
      unit_price: unitPrice,
      line_total: lineTotal,
    };
  });

  const summary = items.reduce(
    (acc, item) => {
      acc.total_quantity += item.quantity;
      acc.total_amount += item.line_total;
      return acc;
    },
    { total_quantity: 0, total_amount: 0 },
  );

  return {
    ...cart,
    items,
    summary,
  };
}

export async function getCartByUserId(userId: number): Promise<CartWithItems> {
  return buildCartResponse(userId);
}

export async function addItemToCart(
  userId: number,
  data: {
    productId?: number;
    bundleId?: number;
    quantity: number;
    size?: string;
    bundleSelections?: BundleSelectionInput[];
  },
): Promise<CartWithItems> {
  const { productId, bundleId, quantity, size, bundleSelections } = data;

  if ((!productId && !bundleId) || (productId && bundleId)) {
    throw new Error(
      'Pilih salah satu produk atau bundle yang ingin ditambahkan.',
    );
  }

  if (!isPositiveInteger(quantity)) {
    throw new Error('Jumlah produk harus berupa bilangan bulat positif.');
  }

  const cart = await ensureCart(userId);

  let normalizedSize: string | null = null;
  let normalizedBundleSelections: BundleSelectionRecord[] = [];

  if (productId) {
    const [product] = await db
      .select()
      .from(schema.productsTable)
      .where(eq(schema.productsTable.id, productId));

    if (!product) throw new Error('Produk tidak ditemukan.');

    const availableSizes = Array.isArray(product.available_sizes)
      ? product.available_sizes
      : [];
    if (availableSizes.length > 0) {
      const trimmed = typeof size === 'string' ? size.trim().toUpperCase() : '';
      if (!trimmed) {
        throw new Error('Pilih ukuran untuk produk ini.');
      }
      const matchedSize = availableSizes.find(
        (itemSize) => itemSize.toUpperCase() === trimmed,
      );
      if (!matchedSize) {
        throw new Error('Ukuran tidak tersedia untuk produk ini.');
      }
      normalizedSize = matchedSize;
    }
  }

  if (bundleId) {
    const [bundle] = await db
      .select()
      .from(schema.bundlesTable)
      .where(eq(schema.bundlesTable.id, bundleId));

    if (!bundle) throw new Error('Bundle tidak ditemukan.');

    const bundleItems = Array.isArray(bundle.bundle_items)
      ? (bundle.bundle_items as Array<{ product_id: number }>)
      : [];
    const bundleProductIds = bundleItems.map((item) => item.product_id);
    const bundleProductsMap = await fetchProductsMap(bundleProductIds);

    normalizedBundleSelections = normalizeBundleSelections({
      bundle,
      productsMap: bundleProductsMap,
      selections: bundleSelections,
    });
  }

  const sizeCondition =
    normalizedSize === null
      ? isNull(schema.cartItemsTable.selected_size)
      : eq(schema.cartItemsTable.selected_size, normalizedSize);

  const bundleSelectionCondition = eq(
    schema.cartItemsTable.selected_bundle_items,
    normalizedBundleSelections,
  );

  const productMatch = productId
    ? and(
        eq(schema.cartItemsTable.product_id, productId),
        sizeCondition,
        isNull(schema.cartItemsTable.bundle_id),
        bundleSelectionCondition,
      )
    : and(
        eq(schema.cartItemsTable.bundle_id, bundleId!),
        isNull(schema.cartItemsTable.product_id),
        bundleSelectionCondition,
      );

  const [existingItem] = await db
    .select()
    .from(schema.cartItemsTable)
    .where(and(eq(schema.cartItemsTable.cart_id, cart.id), productMatch));

  if (existingItem) {
    await db
      .update(schema.cartItemsTable)
      .set({ quantity: existingItem.quantity + quantity })
      .where(eq(schema.cartItemsTable.id, existingItem.id));
  } else {
    await db.insert(schema.cartItemsTable).values({
      cart_id: cart.id,
      product_id: productId ?? null,
      bundle_id: bundleId ?? null,
      selected_size: normalizedSize,
      selected_bundle_items: normalizedBundleSelections,
      quantity,
    });
  }

  return buildCartResponse(userId);
}

export async function updateCartItemQuantity(
  userId: number,
  cartItemId: number,
  quantity: number,
): Promise<CartWithItems> {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error(
      'Jumlah produk harus berupa bilangan bulat dan tidak negatif.',
    );
  }

  const [item] = await db
    .select()
    .from(schema.cartItemsTable)
    .where(eq(schema.cartItemsTable.id, cartItemId));

  if (!item) {
    throw new Error('Item keranjang tidak ditemukan.');
  }

  const [cart] = await db
    .select()
    .from(schema.cartsTable)
    .where(eq(schema.cartsTable.id, item.cart_id));

  if (!cart || cart.user_id !== userId) {
    throw new Error('Item keranjang tidak ditemukan untuk pengguna ini.');
  }

  if (quantity === 0) {
    await db
      .delete(schema.cartItemsTable)
      .where(eq(schema.cartItemsTable.id, cartItemId));

    return buildCartResponse(userId);
  }

  await db
    .update(schema.cartItemsTable)
    .set({ quantity })
    .where(eq(schema.cartItemsTable.id, cartItemId));

  return buildCartResponse(userId);
}

export async function removeCartItem(
  userId: number,
  cartItemId: number,
): Promise<CartWithItems> {
  const [item] = await db
    .select()
    .from(schema.cartItemsTable)
    .where(eq(schema.cartItemsTable.id, cartItemId));

  if (!item) {
    throw new Error('Item keranjang tidak ditemukan.');
  }

  const [cart] = await db
    .select()
    .from(schema.cartsTable)
    .where(eq(schema.cartsTable.id, item.cart_id));

  if (!cart || cart.user_id !== userId) {
    throw new Error('Item keranjang tidak ditemukan untuk pengguna ini.');
  }

  await db
    .delete(schema.cartItemsTable)
    .where(eq(schema.cartItemsTable.id, cartItemId));

  return buildCartResponse(userId);
}

export async function clearCart(userId: number): Promise<CartWithItems> {
  const cart = await ensureCart(userId);

  await db
    .delete(schema.cartItemsTable)
    .where(eq(schema.cartItemsTable.cart_id, cart.id));

  return buildCartResponse(userId);
}
