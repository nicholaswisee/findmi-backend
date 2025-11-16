import type { Context } from 'hono';
import { controller } from '../utils/controller';
import { errorResponse, successResponse } from '../utils/response';
import {
  saveUploadedFile,
  type IncomingUploadFile,
} from '../services/upload.service';
import { UPLOADS_BASE_URL } from '../constants/storage';

function buildFileUrl(relativePath: string, requestUrl: string) {
  if (UPLOADS_BASE_URL) {
    const base = UPLOADS_BASE_URL.endsWith('/')
      ? UPLOADS_BASE_URL.slice(0, -1)
      : UPLOADS_BASE_URL;
    return `${base}${relativePath}`;
  }

  const url = new URL(requestUrl);
  return `${url.origin}${relativePath}`;
}

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
  const fileUrl = buildFileUrl(stored.relativePath, c.req.url);

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
