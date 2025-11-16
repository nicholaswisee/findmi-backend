import type { Context } from 'hono';
import {
  createBundle,
  deleteBundle,
  getAllBundles,
  getBundleById,
  getBundlesByCategory,
  searchBundles,
  updateBundle,
  updateBundleItems,
} from '../services/bundle.service';
import { type UserDepartmentEnum } from '../schemas';
import { errorResponse, successResponse } from '../utils/response';
import { controller } from '../utils/controller';
import type { BundleItemsJSON } from '../db/schema';

type NormalizedBundle<T> = Omit<T, 'bundle_items'> & {
  bundle_items: BundleItemsJSON;
};

function normalizeBundle<T extends { bundle_items: unknown }>(
  bundle: T,
): NormalizedBundle<T> {
  const bundleItems = Array.isArray(bundle.bundle_items)
    ? bundle.bundle_items
    : [];

  return {
    ...bundle,
    bundle_items: bundleItems as BundleItemsJSON,
  };
}

export const getAllBundlesController = controller(async (c: Context) => {
  const query = c.req.query();
  const result = await getAllBundles({
    category: query.category as UserDepartmentEnum,
    search: query.search,
    sortBy: query.sortBy as 'latest' | 'price_asc' | 'price_desc',
    limit: query.limit ? Number(query.limit) : 20,
    offset: query.offset ? Number(query.offset) : 0,
  });

  const transformedBundles = result.bundles.map((bundle) =>
    normalizeBundle(bundle),
  );

  return successResponse(
    c,
    {
      ...result,
      bundles: transformedBundles,
    },
    'Berhasil mendapatkan bundle.',
  );
});

export const getBundleByIdController = controller(async (c: Context) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return errorResponse(c, 'ID bundle tidak valid.', 400);

  const bundle = await getBundleById(id);
  if (!bundle) return errorResponse(c, 'Bundle tidak ditemukan.', 404);

  return successResponse(
    c,
    normalizeBundle(bundle),
    'Berhasil mendapatkan bundle.',
  );
});

export const createBundleController = controller(async (c: Context) => {
  const body = await c.req.json<{
    name: string;
    price: number;
    description?: string;
    bundle_items: BundleItemsJSON;
    category?: UserDepartmentEnum;
    image_urls?: string[];
    is_hidden?: boolean;
  }>();

  if (!body.name || !body.price || !body.bundle_items) {
    return errorResponse(c, 'Isi kolom yang dibutuhkan.', 400);
  }

  const bundle = normalizeBundle(
    await createBundle({
      ...body,
      category: body.category ?? 'none',
      is_hidden: body.is_hidden ?? false,
    }),
  );

  return successResponse(c, bundle, 'Berhasil membuat bundle.', 201);
});

export const updateBundleController = controller(async (c: Context) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return errorResponse(c, 'ID bundle tidak valid.', 400);

  const body = await c.req.json();
  const updated = normalizeBundle(await updateBundle(id, body));

  return successResponse(c, updated, 'Bundle berhasil diperbarui.');
});

export const deleteBundleController = controller(async (c: Context) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return errorResponse(c, 'ID bundle tidak valid.', 400);

  const result = await deleteBundle(id);
  return successResponse(c, result, 'Bundle berhasil dihapus.');
});

export const getBundleByCategoryController = controller(async (c: Context) => {
  const category = c.req.param('category');
  if (!category) return errorResponse(c, 'Masukkan kategori.', 400);

  const bundles = await getBundlesByCategory(category as UserDepartmentEnum);
  return successResponse(
    c,
    bundles.map((bundle) => normalizeBundle(bundle)),
    'Berhasil mendapatkan bundle.',
  );
});

export const searchBundlesController = controller(async (c: Context) => {
  const keyword = c.req.query('keyword');
  if (!keyword) return errorResponse(c, 'Masukkan kata kunci.', 400);

  const bundles = await searchBundles(keyword);
  return successResponse(
    c,
    bundles.map((bundle) => normalizeBundle(bundle)),
    'Berhasil mendapatkan hasil pencarian.',
  );
});

export const updateBundleItemsController = controller(async (c: Context) => {
  const id = Number(c.req.param('id'));
  const { newItems } = await c.req.json<{
    newItems: BundleItemsJSON;
  }>();

  if (isNaN(id)) return errorResponse(c, 'Permintaan tidak valid.', 400);

  const updated = normalizeBundle(await updateBundleItems(id, newItems));
  return successResponse(c, updated, 'Stok berhasil diperbarui.');
});
