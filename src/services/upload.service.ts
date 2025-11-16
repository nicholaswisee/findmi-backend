import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { UPLOADS_DIR, UPLOADS_PUBLIC_PATH } from '../constants/storage';

const mimeExtensionFallback: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

let uploadsDirReady = false;

async function ensureUploadsDir() {
  if (uploadsDirReady) return;
  await mkdir(UPLOADS_DIR, { recursive: true });
  uploadsDirReady = true;
}

export type IncomingUploadFile = {
  name?: string;
  type?: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function getFileExtension(file: IncomingUploadFile) {
  const originalExt = file.name ? path.extname(file.name) : '';
  if (originalExt) return originalExt.toLowerCase();
  const mimeExt = mimeExtensionFallback[file.type];
  return mimeExt ?? '';
}

function joinPublicPath(filename: string) {
  const prefix =
    UPLOADS_PUBLIC_PATH.endsWith('/') && UPLOADS_PUBLIC_PATH !== '/'
      ? UPLOADS_PUBLIC_PATH.slice(0, -1)
      : UPLOADS_PUBLIC_PATH;
  return `${prefix}/${filename}`;
}

export type StoredFile = {
  filename: string;
  relativePath: string;
  absolutePath: string;
  size: number;
  mimeType: string;
};

export async function saveUploadedFile(
  file: IncomingUploadFile,
): Promise<StoredFile> {
  await ensureUploadsDir();
  const extension = getFileExtension(file);
  const filename = `${Date.now()}-${randomUUID()}${extension}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const absolutePath = path.join(UPLOADS_DIR, filename);
  await writeFile(absolutePath, buffer);

  return {
    filename,
    relativePath: joinPublicPath(filename),
    absolutePath,
    size: buffer.byteLength,
    mimeType: file.type || 'application/octet-stream',
  };
}
