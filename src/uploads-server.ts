import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { UPLOADS_DIR } from './constants/storage';
import { stripUploadsPrefix, uploadsRoutePrefix } from './utils/uploads-path';

export function createUploadsServer() {
  const uploadsApp = new Hono();

  uploadsApp.use(
    `${uploadsRoutePrefix}/*`,
    serveStatic({
      root: UPLOADS_DIR,
      rewriteRequestPath: (path) => stripUploadsPrefix(path),
    }),
  );

  uploadsApp.get('/', (c) =>
    c.json({
      status: 'ok',
      directory: UPLOADS_DIR,
      publicPath: uploadsRoutePrefix,
    }),
  );

  return uploadsApp;
}
