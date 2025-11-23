import 'dotenv/config';
import { serve } from '@hono/node-server';
import { app } from './app';
import { loadEnv } from './utils/env';
import { silenceConsoleLogsInProduction } from './utils/logger';
import { createUploadsServer } from './uploads-server';
import { uploadsRoutePrefix } from './utils/uploads-path';
import { UPLOADS_DIR } from './constants/storage';
loadEnv();
silenceConsoleLogsInProduction();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const UPLOADS_SERVER_PORT = (() => {
  const fallback = PORT + 1;
  if (!process.env.UPLOADS_SERVER_PORT) return fallback;

  const parsed = Number(process.env.UPLOADS_SERVER_PORT);
  if (Number.isNaN(parsed)) {
    console.warn(
      `UPLOADS_SERVER_PORT "${process.env.UPLOADS_SERVER_PORT}" is invalid. Falling back to ${fallback}.`,
    );
    return fallback;
  }

  return parsed;
})();

async function bootstrap() {
  try {
    const { db } = await import('./db/db');
    await db.execute('SELECT 1');
    console.log('Database connected successfully');

    serve(
      {
        fetch: app.fetch,
        port: PORT,
        hostname: '0.0.0.0',
      },
      (info) => {
        console.log(`Server running on http://localhost:${info.port}`);
      },
    );

    const uploadsApp = createUploadsServer();
    serve(
      {
        fetch: uploadsApp.fetch,
        port: UPLOADS_SERVER_PORT,
        hostname: '0.0.0.0',
      },
      (info) => {
        console.log(
          `Uploads server running on http://localhost:${info.port}${uploadsRoutePrefix} (dir: ${UPLOADS_DIR})`,
        );
      },
    );
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

bootstrap();
