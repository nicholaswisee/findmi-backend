import type { Context } from 'hono';
import { successResponse, errorResponse } from '../utils/response';
import { controller } from '../utils/controller';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  searchProducts,
  updateProductStock,
} from '../services/product.service';
import type { UserDepartmentEnum } from '../schemas';

export const getAllProductsController = controller(async (c: Context) => {
  const query = c.req.query();
  const products = await getAllProducts({
    category: query.category as UserDepartmentEnum,
    search: query.search,
    sortBy: query.sortBy as 'latest' | 'price_asc' | 'price_desc',
    limit: query.limit ? Number(query.limit) : 20,
    offset: query.offset ? Number(query.offset) : 0,
  });

  return successResponse(c, products, 'Berhasil mendapatkan produk.');
});

export const getProductByIdController = controller(async (c: Context) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return errorResponse(c, 'ID produk tidak valid.', 400);

  const product = await getProductById(id);
  if (!product) return errorResponse(c, 'Produk tidak ditemukan.', 404);

  return successResponse(c, product, 'Berhasil mendapatkan produk.');
});

export const createProductController = controller(async (c: Context) => {
  const body = await c.req.json<{
    name: string;
    price: number;
    description?: string;
    stock: number;
    category?: UserDepartmentEnum;
    image_url?: string;
  }>();

  if (!body.name || !body.price || body.stock === undefined)
    return errorResponse(c, 'Isi kolom yang dibutuhkan.', 400);

  const product = await createProduct({
    ...body,
    category: body.category ?? 'none',
  });

  return successResponse(c, product, 'Berhasil membuat produk.', 201);
});

export const updateProductController = controller(async (c: Context) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return errorResponse(c, 'ID produk tidak valid.', 400);

  const body = await c.req.json();
  const updated = await updateProduct(id, body);

  return successResponse(c, updated, 'Produk berhasil diperbarui.');
});

export const deleteProductController = controller(async (c: Context) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return errorResponse(c, 'ID produk tidak valid.', 400);

  const result = await deleteProduct(id);
  return successResponse(c, result, 'Produk berhasil dihapus.');
});

export const getProductsByCategoryController = controller(
  async (c: Context) => {
    const category = c.req.param('category');
    if (!category) return errorResponse(c, 'Masukkan kategori.', 400);

    const products = await getProductsByCategory(
      category as UserDepartmentEnum,
    );
    return successResponse(c, products, 'Berhasil mendapatkan produk.');
  },
);

export const searchProductsController = controller(async (c: Context) => {
  const keyword = c.req.query('keyword');
  if (!keyword) return errorResponse(c, 'Masukkan kata kunci.', 400);

  const products = await searchProducts(keyword);
  return successResponse(c, products, 'Berhasil mendapatkan hasil pencarian.');
});

export const updateProductStockController = controller(async (c: Context) => {
  const id = Number(c.req.param('id'));
  const { remaining_quantity } = await c.req.json<{
    remaining_quantity: number;
  }>();

  if (isNaN(id) || typeof remaining_quantity !== 'number')
    return errorResponse(c, 'Permintaan tidak valid.', 400);

  const updated = await updateProductStock(id, remaining_quantity);
  return successResponse(c, updated, 'Stok berhasil diperbarui.');
});
