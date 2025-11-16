import path from 'path';

const defaultUploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), 'uploads');

const normalizePublicPath = (value: string | undefined) => {
  if (!value) return '/uploads';
  return value.startsWith('/') ? value : `/${value}`;
};

export const UPLOADS_DIR = defaultUploadsDir;
export const UPLOADS_PUBLIC_PATH = normalizePublicPath(
  process.env.UPLOADS_PUBLIC_PATH,
);
export const UPLOADS_BASE_URL = process.env.UPLOADS_BASE_URL;
