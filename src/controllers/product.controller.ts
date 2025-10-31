import type { Context } from 'hono';
import { successResponse, errorResponse } from '../utils/response';
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

export async function getAllProductsController(c: Context) {
  try {
    const query = c.req.query();
    const products = await getAllProducts({
      category: query.category as any,
      search: query.search,
      sortBy: query.sortBy as any,
      limit: query.limit ? Number(query.limit) : 20,
      offset: query.offset ? Number(query.offset) : 0,
    });

    return successResponse(c, products, 'Berhasil mendapatkan produk.');
  } catch (err) {
    console.error('getAllProducts error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function getProductByIdController(c: Context) {
  try {
    const id = Number(c.req.param('id'));
    if (isNaN(id)) return errorResponse(c, 'ID Produk Invalid', 400);

    const product = await getProductById(id);
    if (!product) return errorResponse(c, 'Produk tidak ditemukan.', 404);

    return successResponse(c, product, 'Berhasil mendapatkan produk.');
  } catch (err) {
    console.error('getProductById error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function createProductController(c: Context) {
  try {
    const body = await c.req.json<{
      name: string;
      price: number;
      description?: string;
      stock: number;
      category?: string;
      image_url?: string;
    }>();

    if (!body.name || !body.price || body.stock === undefined)
      return errorResponse(c, 'Isi kolom yang dibutuhkan.', 400);

    const product = await createProduct({
      ...body,
      category: (body.category as any) ?? 'none',
    });

    return successResponse(c, product, 'Berhasil membuat produk.', 201);
  } catch (err) {
    console.error('createProduct error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function updateProductController(c: Context) {
  try {
    const id = Number(c.req.param('id'));
    if (isNaN(id)) return errorResponse(c, 'ID Produk Invalid', 400);

    const body = await c.req.json();
    const updated = await updateProduct(id, body);

    return successResponse(c, updated, 'Product updated successfully');
  } catch (err) {
    console.error('updateProduct error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function deleteProductController(c: Context) {
  try {
    const id = Number(c.req.param('id'));
    if (isNaN(id)) return errorResponse(c, 'ID Produk invalid.', 400);

    const result = await deleteProduct(id);
    return successResponse(c, result, 'Produk berhasil dihapus.');
  } catch (err) {
    console.error('deleteProduct error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function getProductsByCategoryController(c: Context) {
  try {
    const category = c.req.param('category');
    if (!category) return errorResponse(c, 'Masukkan kategori.', 400);

    const products = await getProductsByCategory(category as any);
    return successResponse(c, products, 'Berhasil mendapatkan produk.');
  } catch (err) {
    console.error('getProductsByCategory error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function searchProductsController(c: Context) {
  try {
    const keyword = c.req.query('keyword');
    if (!keyword) return errorResponse(c, 'Masukkan kata kunci.', 400);

    const products = await searchProducts(keyword);
    return successResponse(
      c,
      products,
      'Berhasil mendapatkan hasil pencarian.',
    );
  } catch (err) {
    console.error('searchProducts error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}

export async function updateProductStockController(c: Context) {
  try {
    const id = Number(c.req.param('id'));
    const { remaining_quantity } = await c.req.json<{
      remaining_quantity: number;
    }>();

    if (isNaN(id) || typeof remaining_quantity !== 'number')
      return errorResponse(c, 'Permintaan invalid.', 400);

    const updated = await updateProductStock(id, remaining_quantity);
    return successResponse(c, updated, 'Stok berhasil diperbarui.');
  } catch (err) {
    console.error('updateProductStock error:', err);
    return errorResponse(c, (err as Error).message, 500);
  }
}
