import { serve } from '@hono/node-server';
import { app } from './app';
import { loadEnv } from './utils/env';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

loadEnv();
const db = drizzle(process.env.DATABASE_URL!);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
