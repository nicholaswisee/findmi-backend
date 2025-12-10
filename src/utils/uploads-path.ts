import { UPLOADS_BASE_URL, UPLOADS_PUBLIC_PATH } from '../constants/storage';

export const uploadsRoutePrefix =
  UPLOADS_PUBLIC_PATH.endsWith('/') && UPLOADS_PUBLIC_PATH !== '/'
    ? UPLOADS_PUBLIC_PATH.slice(0, -1)
    : UPLOADS_PUBLIC_PATH;

export const stripUploadsPrefix = (path: string) => {
  if (path.startsWith(uploadsRoutePrefix)) {
    const trimmed = path.slice(uploadsRoutePrefix.length);
    return trimmed.replace(/^\/+/, '');
  }

  return path;
};

export function buildUploadPublicUrl(
  relativePath: string,
  requestUrl?: string,
  headers?: {
    origin?: string | null;
    host?: string | null;
    forwardedProto?: string | null;
  },
): string {
  if (!relativePath) return '';
  if (/^https?:\/\//i.test(relativePath)) return relativePath;

  const normalizedPath = relativePath.startsWith('/')
    ? relativePath
    : `/${relativePath}`;

  if (UPLOADS_BASE_URL) {
    const base = UPLOADS_BASE_URL.endsWith('/')
      ? UPLOADS_BASE_URL.slice(0, -1)
      : UPLOADS_BASE_URL;
    return `${base}${normalizedPath}`;
  }

  const headerOrigin = headers?.origin ?? null;
  const headerHost = headers?.host ?? null;
  const proto = headers?.forwardedProto || 'http';

  if (headerOrigin) {
    return `${headerOrigin.replace(/\/$/, '')}${normalizedPath}`;
  }

  if (headerHost) {
    return `${proto}://${headerHost}${normalizedPath}`;
  }

  if (requestUrl?.startsWith('http')) {
    try {
      const url = new URL(requestUrl);
      return `${url.origin}${normalizedPath}`;
    } catch (err) {
      console.error('buildUploadPublicUrl failed to parse requestUrl:', err);
    }
  }

  return normalizedPath;
}
