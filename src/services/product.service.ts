import { and, asc, desc, eq, ilike, or } from 'drizzle-orm';
import { db, schema } from '../db/db';

// TO-DO: Fetch all products (with optional filters)
// Import the enum type for category if available, or extract it from your schema

// Import the enum type for category from your schema
type UserDepartmentEnum =
  (typeof schema.productsTable.$inferSelect)['category'];
export async function getAllProducts({
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
    conditions.push(eq(schema.productsTable.category, category));
  }
  if (search) {
    conditions.push(
      or(
        ilike(schema.productsTable.name, `%${search}%`),
        ilike(schema.productsTable.description, `%${search}%`),
      ),
    );
  }

  const query = db
    .select()
    .from(schema.productsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      sortBy === 'price_asc'
        ? asc(schema.productsTable.price)
        : sortBy === 'price_desc'
          ? desc(schema.productsTable.price)
          : desc(schema.productsTable.id),
    )
    .limit(limit)
    .offset(offset);

  return await query;
}

// TO-DO: Fetch single product by ID
export async function getProductById(id: number) {
  // - Query products table by ID
  // - Include related data (images, category, stock, etc.)
  // - Throw NotFoundError if not found
  const query = db
    .select()
    .from(schema.productsTable)
    .where(eq(schema.productsTable.id, id));

  const product = await query;
  if (product.length > 0) {
    return product[0];
  }
}

// TO-DO: Create a new product
export async function createProduct({
  name,
  price,
  description,
  stock,
  category,
  image_url,
}: {
  name: string;
  price: number;
  description?: string;
  stock: number;
  category?: UserDepartmentEnum;
  image_url?: string;
}) {
  const [product] = await db
    .insert(schema.productsTable)
    .values({
      name,
      price,
      category: (category || 'none') as UserDepartmentEnum,
      description: description || '',
      image_url: image_url || '',
      remaining_stock: stock,
    })
    .returning({
      id: schema.productsTable.id,
      name: schema.productsTable.name,
      price: schema.productsTable.price,
      category: schema.productsTable.category,
      description: schema.productsTable.description,
      image_url: schema.productsTable.image_url,
      remaining_stock: schema.productsTable.remaining_stock,
    });

  if (!product) {
    throw new Error('Failed to create product');
  }

  return product;
}

// TO-DO: Update product data
export async function updateProduct(
  id: number,
  data: Partial<{
    name: string;
    slug: string;
    price: number;
    description?: string;
    stock: number;
    category?: UserDepartmentEnum;
    image_url?: string;
  }>,
) {
  const [existingProduct] = await db
    .select()
    .from(schema.productsTable)
    .where(eq(schema.productsTable.id, id));
  if (!existingProduct) {
    throw new Error('Produk tidak ditemukan.');
  }

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.stock !== undefined) updateData.remaining_stock = data.stock;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.image_url !== undefined) updateData.image_url = data.image_url;

  const [updatedProduct] = await db
    .update(schema.productsTable)
    .set(updateData)
    .where(eq(schema.productsTable.id, id))
    .returning({
      id: schema.productsTable.id,
      name: schema.productsTable.name,
      price: schema.productsTable.price,
      category: schema.productsTable.category,
      description: schema.productsTable.description,
      image_url: schema.productsTable.image_url,
      remaining_stock: schema.productsTable.remaining_stock,
    });

  if (!updatedProduct) {
    throw new Error('Gagal memperbarui produk.');
  }

  return updatedProduct;
}

// TO-DO: Delete product by ID
export async function deleteProduct(id: number) {
  const [existingProduct] = await db
    .select()
    .from(schema.productsTable)
    .where(eq(schema.productsTable.id, id));

  if (!existingProduct) {
    throw new Error('Produk tidak ditemukan.');
  }

  const result = await db
    .delete(schema.productsTable)
    .where(eq(schema.productsTable.id, id));

  return {
    success: true,
    message: `Produk dengan ID ${id} telah dihapus.`,
    deletedCount: result.rowCount ?? 1,
  };
}

// TO-DO: Fetch all products in specific category
export async function getProductsByCategory(category: UserDepartmentEnum) {
  const products = await db
    .select()
    .from(schema.productsTable)
    .where(eq(schema.productsTable.category, category));

  if (products.length === 0) {
    throw new Error(`Tidak ada produk pada kategori ${category}.`);
  }

  return products;
}

// TO-DO: Search products by name or description
export async function searchProducts(keyword: string) {
  if (!keyword || keyword.trim() === '') {
    throw new Error('Kata kunci pencarian tidak boleh kosong.');
  }

  const products = await db
    .select()
    .from(schema.productsTable)
    .where(
      or(
        ilike(schema.productsTable.name, `%${keyword}%`),
        ilike(schema.productsTable.description, `%${keyword}%`),
      ),
    )
    .orderBy(schema.productsTable.name);

  return products;
}

// TO-DO: Update stock after order or restock
export async function updateProductStock(productId: number, quantity: number) {
  // - Fetch current stock
  // - Subtract or add based on quantity
  // - Update stock column
  // - Throw error if stock < 0
  const [existingProduct] = await db
    .select()
    .from(schema.productsTable)
    .where(eq(schema.productsTable.id, productId));
  if (!existingProduct) {
    throw new Error('Produk tidak ditemukan.');
  }
  if (quantity < 0) {
    throw new Error('Kuantitas tidak mencukupi.');
  }

  const [updatedProduct] = await db
    .update(schema.productsTable)
    .set({
      remaining_stock: quantity,
    })
    .where(eq(schema.productsTable.id, productId))
    .returning({
      id: schema.productsTable.id,
      name: schema.productsTable.name,
      remaining_stock: schema.productsTable.remaining_stock,
    });

  if (!updatedProduct) {
    throw new Error('Gagal memperbarui stok produk.');
  }

  return updatedProduct;
}
