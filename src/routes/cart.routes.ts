import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  getCart,
  addToCart,
  updateCart,
  removeCartItem,
  clearCart,
} from '../controllers/cart.controller';
import {
  cartSuccessSchema,
  addCartItemBodySchema,
  updateCartItemBodySchema,
} from '../schemas/cart';
import { baseErrorSchema } from '../schemas/common/response';
import { authMiddleware } from '../middlewares/auth.middleware';

const errorSchema = baseErrorSchema.openapi('CartErrorResponse');

export const cartRouter = new OpenAPIHono();

cartRouter.use('*', authMiddleware);

cartRouter.openapi(
  createRoute({
    method: 'get',
    path: '/',
    summary: 'Get current user cart',
    tags: ['Cart'],
    responses: {
      200: {
        description: 'Keranjang berhasil diambil.',
        content: { 'application/json': { schema: cartSuccessSchema } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server Error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  getCart,
);

cartRouter.openapi(
  createRoute({
    method: 'post',
    path: '/items',
    summary: 'Add item to cart',
    tags: ['Cart'],
    request: {
      body: {
        content: { 'application/json': { schema: addCartItemBodySchema } },
      },
    },
    responses: {
      201: {
        description: 'Item berhasil ditambahkan.',
        content: { 'application/json': { schema: cartSuccessSchema } },
      },
      400: {
        description: 'Permintaan tidak valid',
        content: { 'application/json': { schema: errorSchema } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server Error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  addToCart,
);

cartRouter.openapi(
  createRoute({
    method: 'patch',
    path: '/items/{itemId}',
    summary: 'Update cart item quantity',
    tags: ['Cart'],
    request: {
      params: z.object({
        itemId: z.coerce.number().int().positive(),
      }),
      body: {
        content: { 'application/json': { schema: updateCartItemBodySchema } },
      },
    },
    responses: {
      200: {
        description: 'Keranjang berhasil diperbarui.',
        content: { 'application/json': { schema: cartSuccessSchema } },
      },
      400: {
        description: 'Permintaan tidak valid',
        content: { 'application/json': { schema: errorSchema } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      404: {
        description: 'Item tidak ditemukan',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server Error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  updateCart,
);

cartRouter.openapi(
  createRoute({
    method: 'delete',
    path: '/items/{itemId}',
    summary: 'Remove cart item',
    tags: ['Cart'],
    request: {
      params: z.object({
        itemId: z.coerce.number().int().positive(),
      }),
    },
    responses: {
      200: {
        description: 'Item berhasil dihapus.',
        content: { 'application/json': { schema: cartSuccessSchema } },
      },
      400: {
        description: 'Permintaan tidak valid',
        content: { 'application/json': { schema: errorSchema } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      404: {
        description: 'Item tidak ditemukan',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server Error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  removeCartItem,
);

cartRouter.openapi(
  createRoute({
    method: 'delete',
    path: '/',
    summary: 'Clear cart',
    tags: ['Cart'],
    responses: {
      200: {
        description: 'Keranjang berhasil dikosongkan.',
        content: { 'application/json': { schema: cartSuccessSchema } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server Error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  clearCart,
);

export default cartRouter;
