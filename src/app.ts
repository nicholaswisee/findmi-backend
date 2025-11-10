import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { authMiddleware } from './middlewares/auth.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { rateLimiter } from 'hono-rate-limiter';
import authRouter from './routes/auth.routes';
import productRouter from './routes/product.routes';
import bundleRouter from './routes/bundle.routes';
import cartRouter from './routes/cart.routes';
import orderRouter from './routes/order.routes';
import cloudinaryRouter from './routes/cloudinary.route';
import userRouter from './routes/user.routes';
import analyticsRouter from './routes/analytics.routes';

export const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      // Validasi otomatis untuk semua request
      return c.json(
        { error: 'Invalid request', details: z.treeifyError(result.error) },
        400,
      );
    }
  },
});

// app.use(
//   '*',
//   rateLimiter({
//     windowMs: 60000,
//     limit: 200,
//     keyGenerator: (c) =>
//       c.req.header('x-forwarded-for') ||
//       c.req.header('cf-connecting-ip') ||
//       c.req.header('x-real-ip') ||
//       'unknown',
//   }),
// );
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', errorMiddleware);
app.use(
  '*',
  cors({
    origin: [process.env.FRONTEND_URL || '', 'http://localhost:4242'],
    credentials: true,
  }),
);

// For unauthorized users, only allow GET requests and all /auth endpoints
app.use('*', async (c, next) => {
  if (c.req.method === 'GET') {
    return next();
  }

  if (
    c.req.path.toLowerCase() === '/auth' ||
    c.req.path.toLowerCase().startsWith('/auth/') ||
    c.req.path.toLowerCase().startsWith('/order/midtrans/notifications')
  ) {
    return next();
  }

  return authMiddleware(c, next);
});

app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'FindMI API Documentation',
    version: '1.0.0',
  },
});

app.get('/', (c) =>
  c.json({
    name: 'FindMI API',
    version: '1.0.0',
    status: 'healthy',
    message: 'Backend running successfully.',
  }),
);

// app.use(
//   '/auth/*',
//   rateLimiter({
//     windowMs: 60000,
//     limit: 20,
//     keyGenerator: (c) =>
//       c.req.header('x-forwarded-for') ||
//       c.req.header('cf-connecting-ip') ||
//       c.req.header('x-real-ip') ||
//       'unknown',
//   }),
// );

app.route('/auth', authRouter);
app.route('/product', productRouter);
app.route('/bundle', bundleRouter);
app.route('/cart', cartRouter);
app.route('/order', orderRouter);
app.route('/cloudinary', cloudinaryRouter);
app.route('/user', userRouter);
app.route('/analytics', analyticsRouter);

app.get(
  '/docs',
  swaggerUI({ url: '/openapi.json', title: 'FindMI API Documentation' }),
);
