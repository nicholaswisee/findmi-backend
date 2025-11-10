import { createHash } from 'crypto';

type SignatureParamValue = string | number | boolean;

export type CloudinarySignatureOptions = {
  folder?: string;
  publicId?: string;
  eager?: string;
  tags?: string[];
  overwrite?: boolean;
  invalidate?: boolean;
};

const CLOUDINARY_CLOUD_NAME = required('CLOUDINARY_CLOUD_NAME');
const CLOUDINARY_API_KEY = required('CLOUDINARY_API_KEY');
const CLOUDINARY_API_SECRET = required('CLOUDINARY_API_SECRET');

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing Cloudinary env: ${name}`);
  }
  return value;
}

function buildParams(
  options: CloudinarySignatureOptions,
  timestamp: number,
): Record<string, SignatureParamValue> {
  const params: Record<string, SignatureParamValue> = { timestamp };

  if (options.folder) params.folder = options.folder;
  if (options.publicId) params.public_id = options.publicId;
  if (options.eager) params.eager = options.eager;
  if (options.tags && options.tags.length > 0)
    params.tags = options.tags.join(',');
  if (typeof options.overwrite === 'boolean')
    params.overwrite = options.overwrite;
  if (typeof options.invalidate === 'boolean')
    params.invalidate = options.invalidate;

  return params;
}

function signParams(params: Record<string, SignatureParamValue>) {
  const stringToSign = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1')
    .update(stringToSign + CLOUDINARY_API_SECRET)
    .digest('hex');
}

export function generateUploadSignature(options: CloudinarySignatureOptions) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = buildParams(options, timestamp);

  return {
    signature: signParams(params),
    timestamp,
    apiKey: CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME,
    folder: options.folder,
    publicId: options.publicId,
  };
}
