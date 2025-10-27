import { serve } from '@hono/node-server';
import { app } from './app';
import { loadEnv } from './utils/env';
import 'dotenv/config';

loadEnv();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

async function bootstrap() {
  try {
    const { db } = await import('./db/db');
    await db.execute('SELECT 1');
    console.log('Database connected successfully');

    serve(
      {
        fetch: app.fetch,
        port: PORT,
      },
      (info) => {
        console.log(`Server running on http://localhost:${info.port}`);
      },
    );
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

bootstrap();
