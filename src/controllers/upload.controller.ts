import type { Context } from 'hono';
import { controller } from '../utils/controller';
import { errorResponse, successResponse } from '../utils/response';
import {
  saveUploadedFile,
  type IncomingUploadFile,
} from '../services/upload.service';
import { buildUploadPublicUrl } from '../utils/uploads-path';

const isFileLike = (value: unknown): value is IncomingUploadFile => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    typeof (value as IncomingUploadFile).arrayBuffer === 'function'
  );
};

export const uploadMediaController = controller(async (c: Context) => {
  const formData = await c.req.parseBody();
  const maybeFile = formData.file;

  if (!isFileLike(maybeFile)) {
    return errorResponse(c, 'File tidak ditemukan pada form-data.', 400);
  }

  const stored = await saveUploadedFile(maybeFile);
  const fileUrl = buildUploadPublicUrl(stored.relativePath, c.req.url, {
    origin: c.req.header('origin'),
    host: c.req.header('host'),
    forwardedProto: c.req.header('x-forwarded-proto'),
  });

  return successResponse(
    c,
    {
      filename: stored.filename,
      path: stored.relativePath,
      url: fileUrl,
      size: stored.size,
      mimeType: stored.mimeType,
    },
    'Berkas berhasil diunggah.',
  );
});
