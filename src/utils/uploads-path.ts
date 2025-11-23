import { UPLOADS_PUBLIC_PATH } from '../constants/storage';

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
