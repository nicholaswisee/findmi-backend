import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { errorMiddleware } from './middlewares/error.middleware';
import authRouter from './routes/auth.routes';
import { rateLimiter } from 'hono-rate-limiter';
import productRouter from './routes/product.routes';

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

app.use(
  '*',
  rateLimiter({
    windowMs: 60000,
    limit: 60,
    keyGenerator: (c) =>
      c.req.header('x-forwarded-for') ||
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-real-ip') ||
      'unknown',
  }),
);
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', errorMiddleware);
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4242',
    credentials: true,
  }),
);

app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'FindMI 2026 API Documentation',
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

app.route('/auth', authRouter);
app.route('/product', productRouter);

app.get('/docs', swaggerUI({ url: '/openapi.json' }));
