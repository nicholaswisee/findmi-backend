import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { baseErrorSchema } from '../schemas/common/response';
import { uploadBodySchema, uploadSuccessSchema } from '../schemas/upload';
import { uploadMediaController } from '../controllers/upload.controller';

const errorSchema = baseErrorSchema.openapi('UploadErrorResponse');

export const uploadRouter = new OpenAPIHono();

uploadRouter.use('*', authMiddleware);
uploadRouter.use('*', adminMiddleware);

uploadRouter.openapi(
  createRoute({
    method: 'post',
    path: '/upload',
    summary: 'Unggah berkas ke server',
    description:
      'Endpoint ini menerima form-data (multipart) dengan field `file` dan menyimpan berkas ke VPS.',
    tags: ['Media'],
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: uploadBodySchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Berkas berhasil diunggah.',
        content: { 'application/json': { schema: uploadSuccessSchema } },
      },
      400: {
        description: 'Permintaan tidak valid',
        content: { 'application/json': { schema: errorSchema } },
      },
      401: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: errorSchema } },
      },
      403: {
        description: 'Forbidden',
        content: { 'application/json': { schema: errorSchema } },
      },
      500: {
        description: 'Server error',
        content: { 'application/json': { schema: errorSchema } },
      },
    },
  }),
  uploadMediaController,
);

export default uploadRouter;
