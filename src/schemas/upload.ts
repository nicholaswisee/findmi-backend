import { z } from '@hono/zod-openapi';
import { createSuccessResponse } from './common/response';

export const uploadBodySchema = z
  .object({
    file: z.any().openapi({
      type: 'string',
      format: 'binary',
      description: 'Berkas yang akan diunggah (field name: file)',
    }),
  })
  .openapi('UploadBody');

export const uploadedFileSchema = z
  .object({
    filename: z.string().openapi({ example: '1731359872-uuid.png' }),
    path: z.string().openapi({ example: '/uploads/1731359872-uuid.png' }),
    url: z.string().url().openapi({
      example: 'https://api.example.com/uploads/1731359872-uuid.png',
    }),
    size: z.number().int().openapi({ example: 34821 }),
    mimeType: z.string().openapi({ example: 'image/png' }),
  })
  .openapi('UploadedFile');

export const uploadSuccessSchema = createSuccessResponse(
  uploadedFileSchema,
).openapi('UploadSuccessResponse');
