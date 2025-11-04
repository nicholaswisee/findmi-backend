import type { Context } from 'hono';
import { successResponse, errorResponse } from '../utils/response';
import { controller } from '../utils/controller';
import {
  getCartByUserId,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem as removeCartItemService,
  clearCart as clearCartService,
} from '../services/cart.service';
import type { JWTPayload } from '../types/auth';
import { getUserId } from '../utils/user';

export const getCart = controller(async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) return errorResponse(c, 'Unauthorized', 401);

  const cart = await getCartByUserId(userId);
  return successResponse(c, cart, 'Berhasil mendapatkan keranjang.');
});

export const addToCart = controller(async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) return errorResponse(c, 'Unauthorized', 401);

  const body = await c.req.json<{
    productId?: number;
    bundleId?: number;
    quantity: number;
  }>();

  const cart = await addItemToCart(userId, body);
  return successResponse(
    c,
    cart,
    'Item berhasil ditambahkan ke keranjang.',
    201,
  );
});

export const updateCart = controller(async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) return errorResponse(c, 'Unauthorized', 401);

  const cartItemId = Number(c.req.param('itemId'));
  if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
    return errorResponse(c, 'ID item keranjang tidak valid.', 400);
  }

  const body = await c.req.json<{ quantity: number }>();

  const cart = await updateCartItemQuantity(userId, cartItemId, body.quantity);
  return successResponse(c, cart, 'Keranjang berhasil diperbarui.');
});

export const removeCartItem = controller(async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) return errorResponse(c, 'Unauthorized', 401);

  const cartItemId = Number(c.req.param('itemId'));
  if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
    return errorResponse(c, 'ID item keranjang tidak valid.', 400);
  }

  const cart = await removeCartItemService(userId, cartItemId);
  return successResponse(c, cart, 'Item keranjang berhasil dihapus.');
});

export const clearCart = controller(async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) return errorResponse(c, 'Unauthorized', 401);

  const cart = await clearCartService(userId);
  return successResponse(c, cart, 'Keranjang berhasil dikosongkan.');
});
