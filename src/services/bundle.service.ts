import { and, asc, desc, eq, ilike, or } from 'drizzle-orm';
import { db, schema } from '../db/db';
import type { UserDepartmentEnum } from '../schemas';
import type { BundleItemsJSON } from '../db/schema';

export async function getAllBundles({
  category,
  search,
  sortBy,
  limit = 20,
  offset = 0,
}: {
  category?: UserDepartmentEnum;
  search?: string;
  sortBy?: 'latest' | 'price_asc' | 'price_desc';
  limit?: number;
  offset?: number;
}) {
  const conditions = [];

  if (category) {
    conditions.push(eq(schema.bundlesTable.category, category));
  }
  if (search) {
    conditions.push(
      or(
        ilike(schema.bundlesTable.name, `%${search}%`),
        ilike(schema.bundlesTable.description, `%${search}%`),
      ),
    );
  }

  const query = db
    .select()
    .from(schema.bundlesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      sortBy === 'price_asc'
        ? asc(schema.bundlesTable.price)
        : sortBy === 'price_desc'
          ? desc(schema.bundlesTable.price)
          : desc(schema.bundlesTable.id),
    )
    .limit(limit)
    .offset(offset);

  return await query;
}

export async function getBundleById(id: number) {
  const query = db
    .select()
    .from(schema.bundlesTable)
    .where(eq(schema.bundlesTable.id, id));

  const bundle = await query;
  if (bundle.length > 0) {
    return bundle[0];
  }
}

export async function createBundle({
  name,
  description,
  bundle_items,
  image_url,
  price,
  category,
  is_hidden,
}: {
  name: string;
  description?: string;
  price: number;
  bundle_items: BundleItemsJSON;
  category?: UserDepartmentEnum;
  image_url?: string;
  is_hidden: boolean;
}) {
  const [bundle] = await db
    .insert(schema.bundlesTable)
    .values({
      name: name,
      price: price,
      description: description,
      bundle_items: bundle_items,
      category: category,
      image_url: image_url,
      is_hidden: is_hidden,
    })
    .returning({
      id: schema.bundlesTable.id,
      name: schema.bundlesTable.name,
      price: schema.bundlesTable.price,
      description: schema.bundlesTable.description,
      bundle_items: schema.bundlesTable.bundle_items,
      category: schema.bundlesTable.category,
      image_url: schema.bundlesTable.image_url,
      is_hidden: schema.bundlesTable.is_hidden,
    });

  if (!bundle) {
    throw new Error('Failed to create bundle');
  }

  return bundle;
}

export async function updateBundle(
  id: number,
  data: Partial<{
    name: string;
    price: number;
    description?: string;
    bundle_items: BundleItemsJSON;
    category?: UserDepartmentEnum;
    image_url?: string;
    is_hidden: boolean;
  }>,
) {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.bundle_items !== undefined)
    updateData.bundle_items = data.bundle_items;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.image_url !== undefined) updateData.image_url = data.image_url;
  if (data.is_hidden !== undefined) updateData.is_hidden = data.is_hidden;

  const [updateBundle] = await db
    .update(schema.bundlesTable)
    .set(updateData)
    .where(eq(schema.bundlesTable.id, id))
    .returning({
      id: schema.bundlesTable.id,
      name: schema.bundlesTable.name,
      price: schema.bundlesTable.price,
      description: schema.bundlesTable.description,
      bundle_items: schema.bundlesTable.bundle_items,
      category: schema.bundlesTable.category,
      image_url: schema.bundlesTable.image_url,
      is_hidden: schema.bundlesTable.is_hidden,
    });

  if (!updateBundle) {
    throw new Error('Gagal memperbarui bundle.');
  }

  return updateBundle;
}

export async function deleteBundle(id: number) {
  const [existingBundle] = await db
    .select()
    .from(schema.bundlesTable)
    .where(eq(schema.bundlesTable.id, id));

  if (!existingBundle) {
    throw new Error('Bundle tidak ditemukan.');
  }

  const result = await db
    .delete(schema.bundlesTable)
    .where(eq(schema.bundlesTable.id, id));

  return {
    success: true,
    message: `Bundle dengan ID ${id} telah dihapus.`,
    deletedCount: result.rowCount ?? 1,
  };
}

// TO-DO: Fetch all bundles in specific category
export async function getBundlesByCategory(category: UserDepartmentEnum) {
  const bundles = await db
    .select()
    .from(schema.bundlesTable)
    .where(eq(schema.bundlesTable.category, category));

  if (bundles.length === 0) {
    throw new Error(`Tidak ada bundle pada kategori ${category}.`);
  }

  return bundles;
}

// TO-DO: Search bundles by name or description
export async function searchBundles(keyword: string) {
  if (!keyword || keyword.trim() === '') {
    throw new Error('Kata kunci pencarian tidak boleh kosong.');
  }

  const bundles = await db
    .select()
    .from(schema.bundlesTable)
    .where(
      or(
        ilike(schema.bundlesTable.name, `%${keyword}%`),
        ilike(schema.bundlesTable.description, `%${keyword}%`),
      ),
    )
    .orderBy(schema.bundlesTable.name);

  return bundles;
}

export async function updateBundleItems(
  bundleId: number,
  items: BundleItemsJSON,
) {
  const [existingBundle] = await db
    .select()
    .from(schema.bundlesTable)
    .where(eq(schema.bundlesTable.id, bundleId));
  if (!existingBundle) {
    throw new Error('Produk tidak ditemukan.');
  }
  if (items.length < 1) {
    throw new Error('Produk dalam bundle tidak mencukupi.');
  }

  const [updatedBundle] = await db
    .update(schema.bundlesTable)
    .set({ bundle_items: items })
    .where(eq(schema.bundlesTable.id, bundleId))
    .returning({
      id: schema.bundlesTable.id,
      name: schema.bundlesTable.name,
      bundle_items: schema.bundlesTable.bundle_items,
    });

  if (!updatedBundle) throw new Error('Gagal memperbarui produk dalam bundle.');

  return updatedBundle;
}
