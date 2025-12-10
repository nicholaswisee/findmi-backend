import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import { saveUploadedFile, type IncomingUploadFile } from './upload.service';
import { buildUploadPublicUrl } from '../utils/uploads-path';

type StoreImageOptions = {
  folder?: string;
  requestUrl?: string;
  headers?: {
    origin?: string | null;
    host?: string | null;
    forwardedProto?: string | null;
  };
  preferCloudinary?: boolean;
  requireCloudinary?: boolean;
};

export type StoredImage = {
  provider: 'cloudinary' | 'local';
  url: string;
  path?: string;
  publicId?: string;
  size?: number;
  mimeType?: string;
};

let cloudinaryReady = false;

function ensureCloudinaryConfigured(): boolean {
  if (cloudinaryReady) return true;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  cloudinaryReady = true;
  return true;
}

async function uploadToCloudinary(
  file: IncomingUploadFile,
  folder?: string,
): Promise<StoredImage> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const targetFolder = folder ?? process.env.CLOUDINARY_UPLOAD_FOLDER;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: targetFolder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            error ??
              new Error('Upload ke Cloudinary gagal tanpa pesan kesalahan.'),
          );
        }

        resolve({
          provider: 'cloudinary',
          url: result.secure_url ?? result.url,
          publicId: result.public_id,
          size: result.bytes,
          mimeType:
            result.resource_type && result.format
              ? `${result.resource_type}/${result.format}`
              : (file.type ?? 'application/octet-stream'),
        });
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function storeImageFile(
  file: IncomingUploadFile,
  options?: StoreImageOptions,
): Promise<StoredImage> {
  const shouldUseCloudinary =
    options?.preferCloudinary !== false && ensureCloudinaryConfigured();

  if (options?.requireCloudinary && !shouldUseCloudinary) {
    throw new Error(
      'Cloudinary belum dikonfigurasi. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET.',
    );
  }

  if (shouldUseCloudinary) {
    try {
      return await uploadToCloudinary(file, options?.folder);
    } catch (err) {
      console.error(
        'Upload Cloudinary gagal, fallback ke penyimpanan lokal:',
        err,
      );
    }
  }

  const stored = await saveUploadedFile(file);
  const publicUrl = buildUploadPublicUrl(
    stored.relativePath,
    options?.requestUrl,
    options?.headers,
  );

  return {
    provider: 'local',
    url: publicUrl,
    path: stored.relativePath,
    size: stored.size,
    mimeType: stored.mimeType,
  };
}
